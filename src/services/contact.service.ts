import { LinkPrecedence, Contact } from "@prisma/client";
import {
    findContactsByEmailOrPhone,
    findContactsByPrimaryIds,
    createContact,
    updateContact,
    runInTransaction,
} from "../repositories/contact.repository";

/**
 * Main identity resolution function
 */
export const identifyContact = async (
    email?: string,
    phoneNumber?: string
) => {
    if (!email && !phoneNumber) {
        throw new Error("Either email or phoneNumber must be provided");
    }

    return runInTransaction(async (tx) => {
        // 1 Find direct matches
        const matchedContacts = await findContactsByEmailOrPhone(
            email,
            phoneNumber,
            tx
        );

        // 2 If none exist → create new primary
        if (matchedContacts.length === 0) {
            const createData: any = {
                linkPrecedence: LinkPrecedence.primary,
                linkedId: null,
            };

            if (email) createData.email = email;
            if (phoneNumber) createData.phoneNumber = phoneNumber;

            const newPrimary = await createContact(createData, tx);

            return buildResponse([newPrimary]);
        }

        // 3 Get all related primary IDs
        const primaryIds = new Set<number>();

        for (const contact of matchedContacts) {
            if (contact.linkPrecedence === "primary") {
                primaryIds.add(contact.id);
            } else if (contact.linkedId) {
                primaryIds.add(contact.linkedId);
            }
        }

        // 4 Fetch full cluster
        const allContacts = await findContactsByPrimaryIds(
            Array.from(primaryIds),
            tx
        );

        // 5 Determine oldest primary
        const primaries = allContacts.filter(
            (c) => c.linkPrecedence === "primary"
        );

        primaries.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );

        const [oldestPrimary] = primaries;

        if (!oldestPrimary) {
            throw new Error("Invariant violation: No primary contact found");
        }

        // 6 Merge other primaries into oldest
        for (const primary of primaries) {
            if (primary.id !== oldestPrimary.id) {
                await updateContact(
                    primary.id,
                    {
                        linkedId: oldestPrimary.id,
                        linkPrecedence: LinkPrecedence.secondary,
                    },
                    tx
                );
            }
        }

        // 7 Refetch cluster after potential merge
        const updatedCluster = await findContactsByPrimaryIds([
            oldestPrimary.id
        ], tx);

        // 8 Check if incoming data is new
        const emails = new Set(updatedCluster.map((c) => c.email).filter(Boolean));
        const phones = new Set(
            updatedCluster.map((c) => c.phoneNumber).filter(Boolean)
        );

        const isNewEmail = email && !emails.has(email);
        const isNewPhone = phoneNumber && !phones.has(phoneNumber);

        if (isNewEmail || isNewPhone) {
            const secondaryData: any = {
                linkPrecedence: LinkPrecedence.secondary,
                linkedId: oldestPrimary.id,
            };

            if (email) secondaryData.email = email;
            if (phoneNumber) secondaryData.phoneNumber = phoneNumber;

            await createContact(secondaryData, tx);
        }

        // 9 Final cluster
        const finalCluster = await findContactsByPrimaryIds([
            oldestPrimary.id,
        ], tx);

        return buildResponse(finalCluster);
    });
};

/**
 * Build response payload
 */
const buildResponse = (contacts: Contact[]) => {
    const primary = contacts.find(
        (c) => c.linkPrecedence === "primary"
    )!;

    const secondaryContacts = contacts.filter(
        (c) => c.linkPrecedence === "secondary"
    );

    const emails = [
        primary.email,
        ...secondaryContacts.map((c) => c.email),
    ].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];

    const phoneNumbers = [
        primary.phoneNumber,
        ...secondaryContacts.map((c) => c.phoneNumber),
    ].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];

    return {
        contact: {
            primaryContactId: primary.id,
            emails,
            phoneNumbers,
            secondaryContactIds: secondaryContacts.map((c) => c.id),
        },
    };
};