import { Request, Response, NextFunction } from "express";
import { identifyContact } from "../services/contact.service";

export const identify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, phoneNumber } = req.body;

    const result = await identifyContact(email, phoneNumber);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};