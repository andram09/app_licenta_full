import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

export const Trip = sequelize.define('Trip', {
  id_trip: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  destination_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destination_lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  destination_lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  number_of_days: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'trips',
  timestamps: true,
  paranoid: true,
  deletedAt: 'deleted_at'
});
