const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

// Tabel pentru stocarea refresh token-urilor
// Momentan folosit cu token dummy - pregatit pentru implementare completa ulterior
const RefreshToken = sequelize.define('RefreshToken', {
  id_token: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Token-ul efectiv stocat - acelasi cu access token in varianta dummy
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  // Data la care token-ul expira (7 zile de la generare)
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // Null daca token-ul este activ
  // Setat la momentul actual la logout sau revocare
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at'
});

module.exports = RefreshToken;