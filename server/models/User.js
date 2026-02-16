const { DataTypes } = require('sequelize')
const sequelize = require('../config/db.config')

const User = sequelize.define("User", {
    id_user: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('USER', 'ADMIN'),
        defaultValue: 'USER'
    },
    email_confirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
},
    {
        tableName: 'users',
        timestamps: true,
        paranoid: true,
        deletedAt: 'deleted_at'
    }
);

module.exports = User;