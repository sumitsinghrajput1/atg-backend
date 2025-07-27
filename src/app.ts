import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorHandler";

// import { insertAdmin } from "./utils/insertAdmin";


// import fileUpload from "express-fileupload";



//ROUTERS
import productRoutes from "./routes/product"; 
import categoryRoutes from "./routes/category";
import userRoutes from "./routes/user";
import tagRoutes from "./routes/tag";
import orderRoutes from "./routes/order"
import couponRoutes from "./routes/coupon"
import adminRoutes from './routes/admin'

const app: Application = express();

app.use(cors({
  origin: ["http://localhost:8080", "frabjous-hummingbird-09b12e.netlify.app"], // ✅ Correct way
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());




//API..
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/coupons" , couponRoutes)
app.use('/api/orders', orderRoutes);
app.use('/api/admin' , adminRoutes);



app.get("/ping", (_req, res) => {
  res.send("pong");
});

// const createInitialAdmin = async () => {
//   const result = await insertAdmin({
//     email: "singhsahabh704@gmail.com",
//     password: "SecurePass123",
//     name: "Super Admin",
//     role: "super_admin"
//   });

//   if (result?.success) {
//     console.log("✅ Super admin created:", result.admin);
//   } else {
//     console.log("ℹ️ Admin creation result:", result?.message);
//   }
// };

// // Only run this once
// createInitialAdmin();


app.use(errorHandler);

export default app;
