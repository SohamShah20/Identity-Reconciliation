import { prisma } from "../config/prisma";
import { LinkPrecedence, Prisma, Contact } from "@prisma/client";

/**
 * Find contacts that match given email OR phoneNumber
 */
export const findContactsByEmailOrPhone = async (
  email?: string,
  phoneNumber?: string
): Promise<Contact[]> => {
  return prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as Prisma.ContactWhereInput[],
    },
  });
};

/**
 * Find full contact cluster given primary IDs
 */
export const findContactsByPrimaryIds = async (
  primaryIds: number[]
): Promise<Contact[]> => {
  return prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: primaryIds } },
        { linkedId: { in: primaryIds } },
      ],
    },
  });
};

/**
 * Create new contact
 */
export const createContact = async (
  data: {
    email?: string;
    phoneNumber?: string;
    linkedId?: number | null;
    linkPrecedence: LinkPrecedence;
  },
  tx?: Prisma.TransactionClient
): Promise<Contact> => {
  const db = tx ?? prisma;

  return db.contact.create({
    data: {
      email: data.email ?? null,
      phoneNumber: data.phoneNumber ?? null,
      linkedId: data.linkedId ?? null,
      linkPrecedence: data.linkPrecedence,
    },
  });
};

/**
 * Update contact (used for merging primaries)
 */
export const updateContact = async (
  id: number,
  data: Partial<{
    linkedId: number | null;
    linkPrecedence: LinkPrecedence;
  }>,
  tx?: Prisma.TransactionClient
): Promise<Contact> => {
  const db = tx ?? prisma;

  return db.contact.update({
    where: { id },
    data,
  });
};

/**
 * Run logic inside transaction
 */
export const runInTransaction = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(async (tx) => {
    return callback(tx);
  });
};