const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Objective = sequelize.define('Objective', {
    id_objective: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_trip_day: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_category: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    coord_lat: {
        type: DataTypes.DECIMAL(10, 8)
    },
    coord_lng: {
        type: DataTypes.DECIMAL(11, 8)
    },
    address: {
        type: DataTypes.STRING
    },
    planned_time: {
        type: DataTypes.TIME
    },
    position_in_day: {
        type: DataTypes.INTEGER
    },
    source_type: {
        type: DataTypes.ENUM('API', 'MANUAL'),
        defaultValue: 'MANUAL'
    },
    external_place_id: {
        type: DataTypes.STRING
    },
    external_provider: {
        type: DataTypes.STRING
    }
},
    {
        tableName: 'objectives',
        timestamps: false
    }
);

module.exports = Objective;