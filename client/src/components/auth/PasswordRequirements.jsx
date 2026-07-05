import { Check, X } from "lucide-react";
import "./PasswordRequirements.css";

// Regulile trebuie sa corespunda cu passwordSchema din server/validations/authValidation.js
const RULES = [
    { key: "length", label: "Cel puțin 8 caractere", test: (v) => v.length >= 8 },
    { key: "lower", label: "O literă mică (a-z)", test: (v) => /[a-z]/.test(v) },
    { key: "upper", label: "O literă mare (A-Z)", test: (v) => /[A-Z]/.test(v) },
    { key: "digit", label: "O cifră (0-9)", test: (v) => /[0-9]/.test(v) },
    {
        key: "special",
        label: "Un caracter special (!@#$%^&*)",
        test: (v) => /[!@#$%^&*]/.test(v),
    },
];

// Afiseaza in timp real ce reguli de format sunt indeplinite de parola introdusa
export default function PasswordRequirements({ password }) {
    return (
        <ul className="password-requirements" aria-live="polite">
            {RULES.map((rule) => {
                const met = rule.test(password);
                return (
                    <li
                        key={rule.key}
                        className={`password-requirement ${met ? "met" : "unmet"}`}
                    >
                        {met ? <Check size={14} /> : <X size={14} />}
                        <span>{rule.label}</span>
                    </li>
                );
            })}
        </ul>
    );
}
