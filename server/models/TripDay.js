const { DataTypes } = require('sequelize')
const sequelize = require('../config/db.config')

const TripDay = sequelize.define('TripDay', {
    id_day: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    id_trip: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    day_index: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    calendar_date: { 
        type: DataTypes.DATEONLY, 
        allowNull: true 
    }
},{
    tableName: 'trip_days',
    timestamps: false
});

module.exports=TripDay;