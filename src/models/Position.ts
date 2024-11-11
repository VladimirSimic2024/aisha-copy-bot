import { Schema, model, Document } from 'mongoose';

export interface IPosition extends Document {
    targetWallet: string;
    tokenAddress: string;
    targetTokenAmount: number;
    myTokenAmount: number;
}

const PositionSchema: Schema = new Schema({
    targetWallet: { type: String },
    tokenAddress: { type: String },
    targetTokenAmount: { type: Number },
    myTokenAmount: { type: Number },
});

export const Position = model<IPosition>('Position', PositionSchema);