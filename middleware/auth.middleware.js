require("dotenv").config();
const crypto = require("crypto");

const authenticateRequest = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized. Token required." });

        const decodedToken = Buffer.from(authHeader, "base64").toString("utf-8");
        const [timestamp, key] = decodedToken.split("-");

        if (!timestamp || key !== process.env.SECURE_KEY) { // Compare with stored secret key
            return res.status(401).json({ error: "Invalid token." });
        }

        const requestTime = parseInt(timestamp, 10);
        const currentTime = Date.now();
        const timeDifference = (currentTime - requestTime) / 1000; // Convert to seconds

        if (timeDifference > 300) {
            return res.status(401).json({ error: "Token expired. Please try again." });
        }

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({ error: "Invalid authentication." });
    }
};

module.exports = authenticateRequest;
