import { Schema, model} from "mongoose";

const categorySchema = Schema({
    name: {
        type: String,
        required: [true, "El nombre de la categoría es obligatorio"],
        unique: true
    },
    postVersion: { type: Number, default: 0 },
    description: {
        type: String,
        maxLength: [100, "La descripción no puede exceder los 100 caracteres"]
    }
}, {
    versionKey: false,
    timestamps: true
});

export default model("Category", categorySchema)
