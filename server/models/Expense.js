import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

export const Expense = sequelize.define('Expense', {
    id_expense: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_trip: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_objective:{
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_expense_category: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'EUR'
    },
    no_of_people: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
    },
    date:{
        type: DataTypes. DATE,
        allowNull: true
    },
    note: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'expenses',
    timestamps: true
}
);
