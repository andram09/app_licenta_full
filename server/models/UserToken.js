const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Tabel pentru stocarea token-urilor de resetare parola
const UserToken = sequelize.define('UserToken', {
  id_token: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Token random generat cu crypto - nu este JWT
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  // Data la care token-ul expira (1 ora de la generare)
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // Null daca token-ul nu a fost folosit inca
  // Setat la momentul actual cand token-ul este consumat
  used_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_tokens',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at'
});

module.exports = UserToken;