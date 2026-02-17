import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

export const ExpenseCategory = sequelize.define('ExpenseCategory', {
    id_expense_category: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
},
    {
        tableName: 'expense_categories',
        timestamps: false
    }
);
