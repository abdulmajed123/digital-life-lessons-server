const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const lessonsReportsCollection = db.collection("reportedLessons");
    const favoritesCollection = db.collection("favouritesLessons");

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
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const roleInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: roleInfo.role,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.get("/users/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.role || "user" });
    });

    // app.get("/users/create-lessons", async (req, res) => {
    //   try {
    //     const usersWithLessonCount = await User.aggregate([
    //       {
    //         $lookup: {
    //           from: "lessons",
    //           localField: "_id",
    //           foreignField: "creator",
    //           as: "lessons",
    //         },
    //       },
    //       {
    //         $project: {
    //           name: 1,
    //           email: 1,
    //           role: 1,
    //           totalLessons: { $size: "$lessons" },
    //         },
    //       },
    //     ]);

    //     res.status(200).json(usersWithLessonCount);
    //   } catch (err) {
    //     console.error(err);
    //     res.status(500).json({ message: "Server error" });
    //   }
    // });

    // app.get("/users/create-lessons", async (req, res) => {
    //   const email = req.query.email;

    //   const pipeline = [
    //     {
    //       $match: {
    //         email: email,
    //       },
    //     },
    //     {
    //       $lookup: {
    //         from: "lessons",
    //         localField: "email",
    //         foreignField: "email",
    //         as: "userLessons",
    //       },
    //     },
    //   ];
    // });

    // app.get("/users/create-lessons", async (req, res) => {
    //   const email = req.query.email;

    //   try {
    //     const userWithLessons = await User.aggregate([
    //       { $match: { email: email } }, // user filter
    //       {
    //         $lookup: {
    //           from: "lessons",
    //           localField: "email", // User এর email
    //           foreignField: "email", // Lessons collection এ email field
    //           as: "userLessons", // এই নামে array হবে
    //         },
    //       },
    //       {
    //         $project: {
    //           name: 1,
    //           email: 1,
    //           userLessons: 1,
    //           totalLessons: { $size: "$userLessons" },
    //         },
    //       },
    //     ]);

    //     res.status(200).json(userWithLessons);
    //   } catch (err) {
    //     console.error(err);
    //     res.status(500).json({ message: "Server error" });
    //   }
    // });

    app.post("/lessons", async (req, res) => {
      const lessonData = req.body;
      const result = await lessonsCollection.insertOne(lessonData);
      res.send(result);
    });
    app.post("/lessonsReports", async (req, res) => {
      const report = req.body;
      const result = await lessonsReportsCollection.insertOne(report);
      res.send(result);
    });

    app.get("/lessons", async (req, res) => {
      const cursor = lessonsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const lesson = await lessonsCollection.findOne(query);
      if (!lesson) {
        return res.status(404).send({ error: "Lesson not found" });
      }

      // Count how many lessons this author has created
      const totalLessons = await lessonsCollection.countDocuments({
        authorEmail: lesson.authorEmail,
      });
      res.send({ ...lesson, totalLessons });
    });

    // app.get("/my-lessons/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const result = await lessonsCollection
    //     .find({
    //       authorEmail: email,
    //     })
    //     .toArray();
    //   res.send(result);
    // });

    app.get("/my-lessons/:email", async (req, res) => {
      const email = req.params.email;

      try {
        const lessons = await lessonsCollection
          .find({ authorEmail: email })
          .toArray();

        const totalLessons = await lessonsCollection.countDocuments({
          authorEmail: email,
        });

        res.send({
          totalLessons,
          lessons,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    app.put("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const lessonData = req.body;
      lessonData.updatedAt = new Date().toISOString();
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: lessonData,
      };
      const result = await lessonsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/lessons/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonsCollection.deleteOne(query);
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
          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel`,
        });

        res.json({ url: session.url });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Stripe session failed" });
      }
    });

    // app.patch("/users/make-premium", async (req, res) => {
    //   const sessionId = req.query.session_id;
    //   console.log("session id", sessionId);
    //   const session = await stripe.checkout.sessions.retrieve(sessionId);
    //   res.send({ success: true });
    // });

    app.patch("/users/make-premium", async (req, res) => {
      const sessionId = req.query.session_id;
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const userEmail = session.customer_email;

        if (!userEmail) {
          return res
            .status(400)
            .json({ success: false, message: "No email in session" });
        }

        const result = await usersCollection.updateOne(
          { email: userEmail },
          { $set: { isPremium: true } }
        );

        res.status(200).json({ success: true, updated: result });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    app.patch("/lessons/:id/like", async (req, res) => {
      const { id } = req.params;
      const { userId } = req.body;

      const lesson = await lessonsCollection.findOne({ _id: new ObjectId(id) });
      if (!lesson) return res.status(404).send({ error: "Lesson not found" });

      let likes = lesson.likes || [];
      if (likes.includes(userId)) {
        likes = likes.filter((id) => id !== userId); // Remove like
      } else {
        likes.push(userId); // Add like
      }

      const likesCount = likes.length;

      await lessonsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { likes, likesCount } }
      );

      res.send({ success: true, likesCount });
    });

    // GET /lessons/similar/:lessonId

    // PATCH /lessons/:id/like

    app.get("/lessons/similar/:lessonId", async (req, res) => {
      const lessonId = req.params.lessonId;

      // Get current lesson first
      const currentLesson = await lessonsCollection.findOne({
        _id: new ObjectId(lessonId),
      });
      if (!currentLesson)
        return res.status(404).send({ error: "Lesson not found" });

      // Find similar lessons (same category or same emotional tone, exclude current lesson)
      const similarLessons = await lessonsCollection
        .find({
          _id: { $ne: new ObjectId(lessonId) },
          $or: [
            { category: currentLesson.category },
            { emotionalTone: currentLesson.emotionalTone },
          ],
        })
        .limit(6)
        .toArray();

      res.send(similarLessons);
    });

    // app.post("/favorites", async (req, res) => {
    //   const { lessonId, email } = req.body;

    //   // 1️⃣ Check if already exists
    //   const exists = await favoritesCollection.findOne({ lessonId, email });
    //   if (exists) {
    //     return res.send({ message: "Already saved" });
    //   }

    //   // 2️⃣ Find the Lesson data
    //   const lesson = await lessonsCollection.findOne({
    //     _id: new ObjectId(lessonId),
    //   });

    //   if (!lesson) {
    //     return res.status(404).send({ message: "Lesson not found" });
    //   }

    //   // 3️⃣ Save everything in favorites collection
    //   const favoriteData = {
    //     lessonId,
    //     email,
    //     lessonTitle: lesson.title,
    //     lessonDescription: lesson.description,
    //     category: lesson.category,
    //     emotionalTone: lesson.emotionalTone,
    //     creator: lesson.authorName,
    //     authorImage: lesson.authorPhoto,
    //     accessLevel: lesson.accessLevel,
    //     createdAt: new Date(),
    //   };

    //   const result = await favoritesCollection.insertOne(favoriteData);

    //   res.send(result);
    // });

    // app.delete("/favorites", async (req, res) => {
    //   const { lessonId, email } = req.body;

    //   if (!lessonId || !email) {
    //     return res.send({ success: false, message: "Invalid data" });
    //   }

    //   const result = await favoritesCollection.deleteOne({
    //     lessonId,
    //     email,
    //   });

    //   res.send(result);
    // });

    app.post("/favorites", async (req, res) => {
      const { lessonId, email } = req.body;

      // Check if already exists
      const exists = await favoritesCollection.findOne({ lessonId, email });
      if (exists) {
        return res.send({ message: "Already saved" });
      }

      const lesson = await lessonsCollection.findOne({
        _id: new ObjectId(lessonId),
      });

      if (!lesson) {
        return res.status(404).send({ message: "Lesson not found" });
      }

      const favoriteData = {
        lessonId,
        email,
        lessonTitle: lesson.title,
        lessonDescription: lesson.description,
        category: lesson.category,
        emotionalTone: lesson.emotionalTone,
        creator: lesson.authorName,
        authorImage: lesson.authorPhoto,
        accessLevel: lesson.accessLevel,
        createdAt: new Date(),
      };

      const result = await favoritesCollection.insertOne(favoriteData);

      res.send(result);
    });
    app.delete("/favorites", async (req, res) => {
      const { lessonId, email } = req.body;

      if (!lessonId || !email) {
        return res.send({ success: false, message: "Invalid data" });
      }

      const result = await favoritesCollection.deleteOne({
        lessonId,
        email,
      });

      res.send(result);
    });

    app.get("/favorites/:lessonId/:email", async (req, res) => {
      const { lessonId, email } = req.params;

      // Check if user saved this lesson
      const fav = await favoritesCollection.findOne({
        lessonId,
        userEmail: email,
      });

      // Count how many total favorites this lesson has
      const count = await favoritesCollection.countDocuments({ lessonId });

      res.send({
        isFavorite: !!fav,
        favoritesCount: count,
      });
    });

    // GET /favorites/user/:email
    app.get("/favorites/:email", async (req, res) => {
      const email = req.params.email;
      const favorites = await favoritesCollection
        .find({ email: email })
        .toArray();
      res.send(favorites);
    });

    // DELETE favorite by ID
    app.delete("/favorites/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await favoritesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount > 0) {
          res.send({ success: true, message: "Favorite removed successfully" });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Favorite not found" });
        }
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to remove favorite" });
      }
    });

    // Weekly Analytics (New)
    app.get("/analytics/weekly/:email", async (req, res) => {
      const email = req.params.email;
      const today = new Date();
      const last7 = new Date();
      last7.setDate(today.getDate() - 6);

      const pipeline = [
        { $match: { authorEmail: email, createdAt: { $gte: last7 } } },
        { $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 } } },
      ];

      const result = await lessonsCollection.aggregate(pipeline).toArray();
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
