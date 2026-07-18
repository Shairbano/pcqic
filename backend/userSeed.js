const User = require("./models/user"); 
const Employee = require("./models/Employee");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config(); 
const connectDB = require("./config/db"); 

const generateEmployeeId = async () => {
    let next = await Employee.countDocuments() + 1;
    let employeeId = `QSP-${String(next).padStart(5, '0')}`;
    while (await Employee.exists({ employeeId })) {
        next += 1;
        employeeId = `QSP-${String(next).padStart(5, '0')}`;
    }
    return employeeId;
};

const registerAdmin = async () => {
    try {
        await connectDB();

        const existingAdmin = await User.findOne({ email: "shairbanoshairbano3@gmail.com" });
        if (existingAdmin) {
            if (!existingAdmin.isPrimaryAdmin) {
                existingAdmin.isPrimaryAdmin = true;
                await existingAdmin.save();
                console.log("Flagged existing admin as primary (hidden from User Management).");
            }
            const existingProfile = await Employee.findOne({ userId: existingAdmin._id });
            if (!existingProfile) {
                const employeeId = await generateEmployeeId();
                await Employee.create({ userId: existingAdmin._id, employeeId });
                console.log("Admin employee ID created:", employeeId);
            }
            console.log("Admin already exists in database.");
            // Even if it exists, let's print what the credentials should be
            console.log("Existing Admin Credentials -> Email: shairbanoshairbano3@gmail.com | Password: admin");
            process.exit();
        }

        const rawPassword = "admin"; // Store in a variable so you can print it
        const hashPassword = await bcrypt.hash(rawPassword, 10);

        const admin = new User({
            name: "Primary Admin",
            email: "shairbanoshairbano3@gmail.com",
            password: hashPassword,
            role: "admin",
            isPrimaryAdmin: true,
        });

        await admin.save(); 
        const employeeId = await generateEmployeeId();
        await Employee.create({ userId: admin._id, employeeId });
        
        // FIX: Use the variables that actually exist
        console.log("Admin user created successfully!");
        console.log("Credentials saved to DB:");
        console.log("- Email:", admin.email); 
        console.log("- Raw Password:", rawPassword);
        console.log("- Employee ID:", employeeId);
        console.log("- Hashed Password (stored in DB):", admin.password);
        
        process.exit();
    } catch (err) {
        console.log(" User registration error:", err);
        process.exit(1);
    }
};

registerAdmin();