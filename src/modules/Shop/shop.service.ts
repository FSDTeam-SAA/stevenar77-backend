import axios from "axios";
import { Order } from "./shop.model";
import { uploadToCloudinary } from "../../utils/cloudinary";

const GELATO_PRODUCT_API = "https://ecommerce.gelatoapis.com/v1";
const GELATO_API_KEY = process.env.GELATO_API_KEY!;
const STORE_ID = "6d054d84-7f9d-4096-8ef1-485913c694a1"; // static store ID

// get all products from a store 
export class ProductService {
  static async getStoreProducts() {
    const response = await axios.get(
      `${GELATO_PRODUCT_API}/stores/${STORE_ID}/products`,
      {
        headers: { "X-API-KEY": GELATO_API_KEY },
      }
    );
    return response.data.products;
  }
}


export const getStoreProductWithPrices = async (productUid: string) => {
  try {
    // 1️⃣ Fetch all products from the store
    const storeRes = await axios.get(
      `${GELATO_PRODUCT_API}/stores/${STORE_ID}/products`,
      { headers: { "X-API-KEY": GELATO_API_KEY } }
    );

    const storeProducts = storeRes.data.products;

    // 2️⃣ Find the product by UID (either product itself or one of its variants)
    const product = storeProducts.find(
      (p: any) =>
        p.id === productUid ||
        p.variants.some((v: any) => v.productUid === productUid)
    );

    if (!product) throw new Error("Product not found in this store");

    // 3️⃣ Return the full product object exactly as Gelato provides
    return product;
  } catch (err: any) {
    console.error(err.message);
    throw new Error("Failed to fetch product info from Gelato store");
  }
};





export const createDraftOrder = async (userId: string, orderData: any) => {
  try {
    
    // 1️⃣ Generate order reference
    const orderReferenceId = `ORD-${Date.now()}`;

    // 2️⃣ Build Gelato payload
    const gelatoPayload = {
      orderType: "draft",
      orderReferenceId,
      customerReferenceId: userId,
      currency: orderData.currency || "USD",
      items: orderData.items.map((item: any) => ({
        itemReferenceId: item.itemReferenceId,
        productUid: item.productUid,

        files: item.files?.map((f: { type: any; url: any; }) => ({ type: f.type, url: f.url })) || [
  { type: "default", url:"" }
],
        quantity: item.quantity,
      })),
      shipmentMethodUid: orderData.shipmentMethodUid || "express",
      shippingAddress: orderData.shippingAddress,
      returnAddress: orderData.returnAddress,
      metadata: orderData.metadata || [],
    };

    // 3️⃣ Create draft order in Gelato
    const GELATO_ORDER_API = "https://order.gelatoapis.com/v4/orders";
    const gelatoRes = await axios.post(
      GELATO_ORDER_API,
      gelatoPayload,
      { headers: { "X-API-KEY": GELATO_API_KEY } }
    );

    const gelatoOrder = gelatoRes.data;

    // 4️⃣ Save in local DB
    const newOrder = await Order.create({
      user: userId,
      gelatoOrderId: gelatoOrder.id,
      orderType: gelatoPayload.orderType,
      orderReferenceId,
      currency: gelatoPayload.currency,
      items: gelatoPayload.items,
      shippingAddress: gelatoPayload.shippingAddress,
      returnAddress: gelatoPayload.returnAddress,
      status: gelatoOrder.status, // "draft"
      rawResponse: gelatoOrder,   // keep Gelato response for debug
    });

    return newOrder;
  } catch (err: any) {
    console.error("Error creating draft order:", err.response?.data || err.message);
    throw new Error("Failed to create draft order with Gelato");
  }
};






const GELATO_API_URL_Qoute = "https://order.gelatoapis.com/v4/orders:quote";


/**
 * Request a quote from Gelato for given order payload
 * @param payload - order quote payload
 * @returns Gelato API response
 */
export const getQuote = async (orderReferenceId: string) => {
  // 1️⃣ Fetch draft order from DB
  const draftOrder = await Order.findOne({ orderReferenceId });
  if (!draftOrder) {
    throw new Error("Draft order not found");
  }

  // 2️⃣ Build payload for Gelato
  const payload = {
    orderReferenceId: draftOrder.orderReferenceId,
    customerReferenceId: draftOrder.user.toString(),
    currency: draftOrder.currency,
    allowMultipleQuotes: false,
    recipient: draftOrder.shippingAddress,
    products: draftOrder.items.map((item) => ({
      itemReferenceId: item.itemReferenceId,
      productUid: item.productUid,
      files: item.files || [],
      quantity: item.quantity,
    })),
    
  };

  // 3️⃣ Call Gelato API
  try {
    const response = await axios.post(GELATO_API_URL_Qoute, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": GELATO_API_KEY,
      },
    });
    return response.data;
  } catch (err: any) {
    console.error("Gelato Quote Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to fetch Gelato quote");
  }
};




// patch order to real order
    const GELATO_ORDER_API = "https://order.gelatoapis.com/v4/orders";

export const submitDraftOrder = async (
  orderId: string
): Promise<any> => {
  try {
    // 1️⃣ Fetch order from local DB
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // 2️⃣ Update orderType on Gelato
    const response = await axios.patch(
      `${GELATO_ORDER_API}/${order.gelatoOrderId}`,
      { orderType: "order" }, // convert draft to real order
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": GELATO_API_KEY,
        },
      }
    );

    const updatedOrder = response.data;
    console.log("daa",updatedOrder);

    // 3️⃣ Update local DB
    order.orderType = "order";
    order.fulfillmentStatus = updatedOrder.fulfillmentStatus || "submitted";
    await order.save();

    return updatedOrder;
  } catch (err: any) {
    console.error("Error submitting draft order:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to submit draft order");
  }
};



