import { Schema, model, Document } from 'mongoose'

interface ITeamCard {
  _id(_id: any): unknown
  image: {
    public_id: string
    url: string
  }
  title: string
  possition: string
  description: string

  quote: string
  features: string[]
}

export interface IAbout extends Document {
  section1: {
    [x: string]: any
    title: string
    description: string
    images: { public_id: string; url: string }[]
  }
  section2: {
    [x: string]: any
    title: string
    description: string
    images: { public_id: string; url: string }[]
  }
  section3: {
    [x: string]: any
    title: string
    description: string
    images: { public_id: string; url: string }[]
  }
  section4: { title: string; description: string }
  section5: { title: string; description: string }
  team: { title: string; description: string; card: ITeamCard[] }
  galleryImages: { public_id: string; url: string }[]
}

const imageObj = {
  public_id: String,
  url: String,
}

const aboutSchema = new Schema<IAbout>(
  {
    section1: { title: String, description: String, images: [imageObj] },
    section2: { title: String, description: String, images: [imageObj] },
    section3: { title: String, description: String, images: [imageObj] },
    section4: { title: String, description: String },
    section5: { title: String, description: String },
    team: {
      title: String,
      description: String,
      card: [
        {
          image: imageObj,
          title: String,
          possition: String,
          description: String,
          quote: String,
          features: [String],
        },
      ],
    },
    galleryImages: [imageObj],
  },
  { timestamps: true, versionKey: false }
)

export const About = model<IAbout>('About', aboutSchema)
