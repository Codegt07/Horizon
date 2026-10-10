const { Router } = require("express");

const { deposit, getBalance, getTransactions } = require("../controllers/wallet.controller");
const { authenticate } = require("../middlewares/authenticate");
const { requireRole } = require("../middlewares/requireRole");

const router = Router();

// All wallet routes: authenticated investors only
router.use(authenticate);
router.use(requireRole("investor"));

router.post("/deposit",      deposit);
router.get("/balance",       getBalance);
router.get("/transactions",  getTransactions);

module.exports = router;
