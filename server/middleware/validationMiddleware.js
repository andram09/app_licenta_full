export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({ success: false, message: 'Datele introduse nu sunt valide.', errors });
    }

    // Scriem inapoi valoarea normalizata de Joi (ex: email trim + lowercase,
    // nume trim) ca sa ajunga forma curatata in controller, nu inputul brut.
    req.body = value;

    next();
  };
};