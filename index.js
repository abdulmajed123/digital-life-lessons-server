const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1z9sk8c.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("life_lessons_db");
    const usersCollection = db.collection("users");
    const lessonsCollection = db.collection("lessons");

    app.post("/users", async (req, res) => {
      const user = req.body;
      user.role = "user";
      user.isPremium = false;
      user.createdAt = new Date();
      const email = user.email;
      const userExist = await usersCollection.findOne({ email });
      if (userExist) {
        return res.status(409).send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.post("/lessons", async (req, res) => {
      const lessonData = req.body;
      const result = await lessonsCollection.insertOne(lessonData);
      res.send(result);
    });

    // app.post("/create-checkout-session", async (req, res) => {
    //   const paymentInfo = req.body;
    //   const session = await stripe.checkout.session.create({
    //     line_items: [
    //       {
    //         // Provide the exact Price ID (for example, price_1234) of the product you want to sell
    //         price: "{{PRICE_ID}}",
    //         quantity: 1,
    //       },
    //     ],
    //     customer_email: email,
    //     mode: "payment",
    //     success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success`,
    //   });
    // });
    // app.post("/create-checkout-session", async (req, res) => {
    //   const { email } = req.body;

    //   try {
    //     const session = await stripe.checkout.sessions.create({
    //       payment_method_types: ["card"],
    //       mode: "payment",
    //       line_items: [
    //         {
    //           price_data: {
    //             currency: "usd",
    //             unit_amount: 1500 * 100, // ৳1500
    //             product_data: {
    //               name: "Premium Membership",
    //             },
    //           },
    //           quantity: 1,
    //         },
    //       ],
    //       success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?email=${email}`,
    //       cancel_url: `${process.env.SITE_DOMAIN}/dashborad/payment-cancel`,
    //     });

    //     res.send({ url: session.url });
    //   } catch (error) {
    //     console.log(error);
    //     res.status(500).send({ message: "Error creating session" });
    //   }
    // });
    app.post("/create-checkout-session", async (req, res) => {
      const { email } = req.body; // frontend থেকে পাঠানো হবে

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer_email: email,
          line_items: [
            {
              price_data: {
                currency: "bdt",
                product_data: {
                  name: "Lifetime Premium Access",
                },
                unit_amount: 150000, // ৳1500 * 100 (paisa)
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?email=${email}`,
          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel`,
        });

        res.json({ url: session.url });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Stripe session failed" });
      }
    });

    app.patch("/users/make-premium", async (req, res) => {
      const { email } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $set: { isPremium: true } }
      );

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Digital life lessons");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
