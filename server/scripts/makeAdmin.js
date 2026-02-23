import { User, sequelize } from "../models/index.js";

const email = process.argv[2];

if (!email) {process.exit();}

const makeAdmin = async () => {
    try {

        const user = await User.findOne({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            console.log("User not found.");
            process.exit();
        }

        user.role = "ADMIN";
        await user.save();

        console.log(`User ${email} is now ADMIN.`);
        process.exit();

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

makeAdmin();