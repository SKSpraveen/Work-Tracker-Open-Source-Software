const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const controller = require("../controllers/auth.controller");

router.post("/register-company", controller.registerCompany);
router.post("/login", controller.login);
router.post("/add-employee", auth, role("owner", "admin"), controller.addEmployee);

module.exports = router;
