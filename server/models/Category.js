import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

export const Category = sequelize.define('Category', {
    id_category: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    external_category_key: {
        type: DataTypes.STRING
    },
    external_provider: {
        type: DataTypes.STRING
    }
},
    {
        tableName: 'categories',
        timestamps: false
    }
);

