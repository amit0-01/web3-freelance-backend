require("dotenv").config();
const express = require("express");
const Web3 = require("web3").Web3;
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const VirtualAccount = require("./models/virtualAddress.model");
const { dbName } = require("./dbName");
const bodyParser = require("body-parser"); // ✅ Import body-parser
const { encrypt } = require("./utility/encrypt");
const { decrypt } = require("./utility/encrypt");
const QRCode = require("qrcode");
const authenticateRequest = require('./middleware/auth.middleware')


const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

mongoose
    .connect(`${process.env.MONGO_URI}/`, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Rate limiting to prevent spam requests
// const limiter = rateLimit({
//     windowMs: 1 * 60 * 1000, // 1 minute
//     max: 1, // Limit each IP to 5 requests per window
//     message: "Too many requests. Please try again later.",
// });
// app.use("/send-usdt", limiter);


const web3 = new Web3(process.env.BSC_RPC_URL); // Binance Smart Chain RPC URL
const usdtContract = new web3.eth.Contract(
    JSON.parse(process.env.USDT_ABI),
    process.env.USDT_TOKEN_ADDRESS
);

// Main account details
const mainAddress = process.env.MAIN_WALLET;
const mainPrivateKey = process.env.MAIN_PRIVATE_KEY;


// get auth token
app.get("/get-auth-token", (req, res) => {
    try {
        const timestamp = Date.now();
        const secureKey = process.env.SECURE_KEY; // Secure key from .env
        const authToken = Buffer.from(`${timestamp}-${secureKey}`).toString("base64");

        res.json({ authToken });
    } catch (error) {
        console.error("Error generating auth token:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ API Route to Get All Virtual Addresses
app.get("/get-virtual-addresses",authenticateRequest, async (req, res) => {
    try {
        const addresses = await VirtualAccount.find({}, "address -_id"); // Fetch only addresses
        res.json(addresses);
    } catch (error) {
        console.error("Error fetching virtual addresses:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// ✅ API Route to Create a Virtual Address
app.post("/create-address",authenticateRequest, async (req, res) => {
    try {
        const newAccount = web3.eth.accounts.create();
        // Check if address already exists
        const existingAccount = await VirtualAccount.findOne({ address: newAccount.address });
        if (existingAccount) {
            return res.status(400).json({ status: "error", message: "Virtual address already exists." });
        }

        // Encrypt the private key before storing it
        const encryptedPrivateKey = encrypt(newAccount.privateKey);

        // Store in the database
        const virtualAddress = new VirtualAccount({
            address: newAccount.address,
            privateKey: encryptedPrivateKey
        });

        await virtualAddress.save();

        // QR Code Data (contains address)
        const qrData = JSON.stringify({ address: newAccount.address });

        // Generate QR Code URL
        const qrCodeBase64 = await QRCode.toDataURL(qrData);

        // Generate QR Code Base64
        // const qrCodeBase64 = qrCodeUrl.split(",")[1]; // Extract base64 string

        res.status(201).json({
            status: "success",
            message: "New virtual address created.",
            address: newAccount.address,
            // qrCodeUrl,       // Can be used as <img src="qrCodeUrl" />
            qrCodeBase64     // Base64 encoded QR image
        });
    } catch (error) {
        console.error("Error creating virtual address:", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error. Please try again later."
        });
    }
});




// transfer
app.post("/send-usdt", authenticateRequest, async (req, res) => {
    try {
        const { fromAddress, amount } = req.body;

        // Find sender's private key
        const senderAccount = await VirtualAccount.findOne({ address: fromAddress });
        if (!senderAccount) {
            return res.status(400).json({ error: "Sender address not found." });
        }

        // Decrypt private key before use
        const privateKey = decrypt(senderAccount.privateKey);
        console.log("Decrypted private key:", !!privateKey); // Debugging

        const amountInWei = web3.utils.toWei(amount, "ether"); // USDT has 6 decimals

        // Check sender's USDT balance
        const usdtBalance = await usdtContract.methods.balanceOf(fromAddress).call();
        if (BigInt(usdtBalance) < BigInt(amountInWei)) {
            return res.status(400).json({ error: "Insufficient USDT balance." });
        }

        // Check sender's native token balance (BNB/ETH for gas)
        const balance = await web3.eth.getBalance(fromAddress);

        const gasEstimate = await usdtContract.methods.transfer(mainAddress, amountInWei).estimateGas({ from: fromAddress });
        const gasPrice = await web3.eth.getGasPrice();
        const totalGasCost = BigInt(gasEstimate) * BigInt(gasPrice);

        if (BigInt(balance) < totalGasCost) {
            console.log("Sender lacks gas fees. Funding from main wallet...");

            const gasTx = {
                from: mainAddress,
                to: fromAddress,
                value: totalGasCost.toString(),
                gas: 21000,
                gasPrice: gasPrice
            };

            const signedGasTx = await web3.eth.accounts.signTransaction(gasTx, mainPrivateKey);
            await web3.eth.sendSignedTransaction(signedGasTx.rawTransaction);
            console.log("Main account funded virtual address with gas.");
        }

        // Prepare and sign the USDT transfer transaction
        const tx = {
            from: fromAddress,
            to: process.env.USDT_TOKEN_ADDRESS,
            data: usdtContract.methods.transfer(mainAddress, amountInWei).encodeABI(),
            gas: gasEstimate,
            gasPrice: gasPrice,
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        res.json({ success: true, txHash: receipt.transactionHash });
    } catch (error) {
        console.error("Transaction error:", error);
        res.status(500).json({ error: "Transaction failed." });
    }
});


// check if transaction is done for specific person

app.get("/transaction/:hash", async (req, res) => {
    try {
        const { hash } = req.params;

        // Fetch transaction details using the hash
        const transaction = await web3.eth.getTransaction(hash);

        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found." });
        }

        res.json({
            transactionHash: transaction.hash,
            from: transaction.from,
            to: transaction.to,
            value: web3.utils.fromWei(transaction.value, "ether"), // Convert to readable format
            gas: transaction.gas,
            gasPrice: web3.utils.fromWei(transaction.gasPrice, "gwei"),
            blockNumber: transaction.blockNumber,
            status: transaction.blockHash ? "Confirmed" : "Pending",
        });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({ error: "Failed to fetch transaction." });
    }
});




const PORT = process.env.PORT || 3000; // Use environment port or default to 3000

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
