import { model, Schema } from 'mongoose'
import { IProduct } from './product.interface'

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    price: { type: Number, required: true },
    images: [
      {
        public_id: { type: String },
        url: { type: String },
        _id: false,
      },
    ],
    category: { type: String, required: true },
    longDescription: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    featured: { type: [String], default: [] },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    variants: [
      {
        title: { type: String, required: true },
        image: {
          public_id: { type: String },
          url: { type: String },
          _id: false,
        },
        quantity: { type: Number, required: true },

        _id: false,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

const Product = model<IProduct>('Product', productSchema)
export default Product
