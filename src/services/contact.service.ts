import { Contact, LinkPrecedence } from "@prisma/client";
import {
  findContactsByEmailsOrPhones,
  createContact,
  updateContact,
  runInTransaction,
} from "../repositories/contact.repository";

/**
 * Graph-based identity resolution
 */
export const identifyContact = async (
  email?: string,
  phoneNumber?: string
) => {
  if (!email && !phoneNumber) {
    throw new Error("Either email or phoneNumber must be provided");
  }

  return runInTransaction(async (tx) => {
    // -----------------------------
    // Graph Expansion
    // -----------------------------

    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const visited = new Map<number, Contact>();

    if (email) emailSet.add(email);
    if (phoneNumber) phoneSet.add(phoneNumber);

    let expansion = true;

    while (expansion) {
      expansion = false;

      const found = await findContactsByEmailsOrPhones(
        Array.from(emailSet),
        Array.from(phoneSet),
        tx
      );

      for (const contact of found) {
        if (!visited.has(contact.id)) {
          visited.set(contact.id, contact);
          expansion = true;

          if (contact.email) emailSet.add(contact.email);
          if (contact.phoneNumber) phoneSet.add(contact.phoneNumber);
        }
      }
    }

    const allContacts = Array.from(visited.values());

    // -----------------------------
    // If no existing contacts
    // -----------------------------
    if (allContacts.length === 0) {
      const createData: any = {
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
      };

      if (email) createData.email = email;
      if (phoneNumber) createData.phoneNumber = phoneNumber;

      const newPrimary = await createContact(createData, tx);

      return buildResponse([newPrimary]);
    }

    // -----------------------------
    // Determine Oldest Primary
    // -----------------------------
    const primaries = allContacts.filter(
      (c) => c.linkPrecedence === "primary"
    );

    // If none marked primary (edge case), treat all as candidates
    const candidates = primaries.length ? primaries : allContacts;

    candidates.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    const [oldestPrimary] = candidates;

    if (!oldestPrimary) {
      throw new Error("Invariant violation: No primary contact found");
    }

    // -----------------------------
    // Rewire Entire Cluster
    // -----------------------------
    for (const contact of allContacts) {
      if (contact.id !== oldestPrimary.id) {
        if (
          contact.linkPrecedence !== "secondary" ||
          contact.linkedId !== oldestPrimary.id
        ) {
          await updateContact(
            contact.id,
            {
              linkPrecedence: LinkPrecedence.secondary,
              linkedId: oldestPrimary.id,
            },
            tx
          );
        }
      }
    }

    // -----------------------------
    // Add New Info If Needed
    // -----------------------------
    const existingEmails = new Set(
      allContacts.map((c) => c.email).filter(Boolean) as string[]
    );

    const existingPhones = new Set(
      allContacts.map((c) => c.phoneNumber).filter(Boolean) as string[]
    );

    const isNewEmail = email && !existingEmails.has(email);
    const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

    if (isNewEmail || isNewPhone) {
      const secondaryData: any = {
        linkPrecedence: LinkPrecedence.secondary,
        linkedId: oldestPrimary.id,
      };

      if (email) secondaryData.email = email;
      if (phoneNumber) secondaryData.phoneNumber = phoneNumber;

      await createContact(secondaryData, tx);
    }

    // -----------------------------
    // Final Cluster Fetch
    // -----------------------------
    const finalCluster = await findContactsByEmailsOrPhones(
      Array.from(emailSet),
      Array.from(phoneSet),
      tx
    );

    return buildResponse(finalCluster);
  });
};

/**
 * Build API response
 */
const buildResponse = (contacts: Contact[]) => {
  const primary = contacts.find(
    (c) => c.linkPrecedence === "primary"
  );

  if (!primary) {
    throw new Error("Invariant violation: No primary in final cluster");
  }

  const secondaries = contacts.filter(
    (c) => c.linkPrecedence === "secondary"
  );

  const emails = [
    primary.email,
    ...secondaries.map((c) => c.email),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];

  const phoneNumbers = [
    primary.phoneNumber,
    ...secondaries.map((c) => c.phoneNumber),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];

  return {
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaries.map((c) => c.id),
    },
  };
};