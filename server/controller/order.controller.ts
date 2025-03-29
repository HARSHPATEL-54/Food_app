import { Request, Response } from "express";
import { Restaurant } from "../models/restaurant.model";
import { Order } from "../models/order.model";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CheckoutSessionRequest = {
    cartItems: {
        menuId: string;
        name: string;
        image: string;
        price: number;
        quantity: number
    }[],
    deliveryDetails: {
        name: string;
        email: string;
        address: string;
        city: string
    },
    restaurantId: string
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await Order.find({ user: req.id }).populate('user').populate('restaurant');
        res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const checkoutSessionRequest: CheckoutSessionRequest = req.body;
        console.log("Received checkout session request:", checkoutSessionRequest);

        const restaurant = await Restaurant.findById(checkoutSessionRequest.restaurantId).populate('menus');

        if (!restaurant) {
            console.error("Error: Restaurant not found for ID:", checkoutSessionRequest.restaurantId);
            res.status(404).json({ success: false, message: "Restaurant not found." });
            return;
        }

        const order: any = new Order({
            restaurant: restaurant._id,
            user: req.id,
            deliveryDetails: checkoutSessionRequest.deliveryDetails,
            cartItems: checkoutSessionRequest.cartItems,
            status: "pending"
        });

        const menuItems = restaurant.menus;
        if (!menuItems || menuItems.length === 0) {
            console.error("Error: No menu items found for restaurant:", checkoutSessionRequest.restaurantId);
            res.status(400).json({ success: false, message: "No menu items found for the restaurant" });
            return;
        }

        console.log("Menu items fetched from restaurant:", menuItems);

        const lineItems = createLineItems(checkoutSessionRequest, menuItems);
        console.log("Line items for Stripe checkout:", lineItems);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            shipping_address_collection: {
                allowed_countries: ['GB', 'US', 'CA']
            },
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/order/status`,
            cancel_url: `${process.env.FRONTEND_URL}/cart`,
            metadata: {
                orderId: order._id.toString(),
                images: JSON.stringify(menuItems.map((item: any) => item.image))
            }
        });

        if (!session.url) {
            console.error("Error: Failed to create Stripe session");
            res.status(400).json({ success: false, message: "Error while creating session" });
            return;
        }

        await order.save();
        res.status(200).json({ session });
    } catch (error) {
        console.error("Internal server error in checkout session:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    let event;

    try {
        const signature = req.headers["stripe-signature"];
        const payloadString = JSON.stringify(req.body, null, 2);
        const secret = process.env.WEBHOOK_ENDPOINT_SECRET!;

        const header = stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret,
        });

        event = stripe.webhooks.constructEvent(payloadString, header, secret);
    } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).send(`Webhook error: ${error.message}`);
        return;
    }

    if (event.type === "checkout.session.completed") {
        try {
            const session = event.data.object as Stripe.Checkout.Session;
            const order = await Order.findById(session.metadata?.orderId);

            if (!order) {
                console.error("Error: Order not found for session:", session.metadata?.orderId);
                res.status(404).json({ message: "Order not found" });
                return;
            }

            if (session.amount_total) {
                order.totalAmount = session.amount_total;
            }
            order.status = "confirmed";
            await order.save();
        } catch (error) {
            console.error('Error handling event:', error);
            res.status(500).json({ message: "Internal Server Error" });
            return;
        }
    }

    res.status(200).send();
};

export const createLineItems = (checkoutSessionRequest: CheckoutSessionRequest, menuItems: any) => {
    return checkoutSessionRequest.cartItems.map((cartItem) => {
        console.log("Processing cart item:", cartItem);

        const menuItem = menuItems.find((item: any) => item._id.toString() === cartItem.menuId);
        if (!menuItem) {
            console.error(`Error: Menu item not found for ID ${cartItem.menuId}`);
            throw new Error(`Menu item id ${cartItem.menuId} not found`);
        }

        return {
            price_data: {
                currency: 'inr',
                product_data: {
                    name: menuItem.name,
                    images: [menuItem.image],
                },
                unit_amount: menuItem.price * 100
            },
            quantity: cartItem.quantity,
        };
    });
};
