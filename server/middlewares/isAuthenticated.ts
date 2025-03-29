import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
            return; // Ensure function execution stops
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY!) as jwt.JwtPayload;

        if (!decoded || !decoded.userId) {
            res.status(401).json({
                success: false,
                message: "Invalid token"
            });
            return;
        }

        req.id = decoded.userId;
        next(); // Ensure the next middleware is executed
    } catch (error) {
        console.error("Authentication Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
