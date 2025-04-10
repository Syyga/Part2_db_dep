import { ApiSignature } from "../../../types";
import marketCuService from "../services/market.cu.service";
import marketService from "../services/market.service";

const getMarketList: ApiSignature = async (req, res) => {
  const queries = req.query;

  console.log("queries", queries);

  const response = await marketService.getMarketList(queries);

  res.status(200).send(response);
};

const getMarketMe: ApiSignature = async (req, res) => {
  const queries = req.query;
  const user = req.user as { id: string; role: string };

  const response = await marketService.getMarketMe(queries, user);

  res.status(200).send(response);
};

const getMarketListCount: ApiSignature = async (req, res) => {
  const queries = req.query;

  const response = await marketService.getMarketListCount(queries);

  res.status(200).send(response);
};

const getMarketMeCount: ApiSignature = async (req, res) => {
  const queries = req.query;
  const userId = req.user.id;

  const response = await marketService.getMarketMeCount(queries, userId);

  res.status(200).send(response);
};

const createMarketItem: ApiSignature = async (req, res) => {
  const userId = req.user.id;
  const body = req.body;

  const response = await marketCuService.createMarketItem(body, userId);

  res.status(201).send(response);
};

const purchaseMarketItem: ApiSignature = async (req, res) => {
  const userId = req.user.id;
  const body = req.body;

  const response = await marketCuService.purchaseMarketItem(body, userId);

  res.status(200).send(response);
};

const marketController = {
  getMarketList,
  getMarketMe,
  getMarketListCount,
  getMarketMeCount,
  createMarketItem,
  purchaseMarketItem,
};

export default marketController;
