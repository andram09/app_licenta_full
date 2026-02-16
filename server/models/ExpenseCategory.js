const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ExpenseCategory = sequelize.define('ExpenseCategory', {
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

module.exports = ExpenseCategory;