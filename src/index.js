import express from "express";
const app = express();

const PORT = process.env.PORT || 8080
app.listen(3000, (err) => {
    if (err) {
        console.error(err);
    }
    console.log(`Server listening at PORT ${PORT}`);
})