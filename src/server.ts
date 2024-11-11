import express, { Request, Response } from 'express';
import * as mongodb from './db';
import { processSignature } from './copytrade';
import { PORT } from './config';

const start = async () => {

  await mongodb.connect();

  const app = express();

  app.use(express.json());

  app.post('/api/signature', (req: Request, res: Response) => {
    const swapInfo = req.body;
    console.log('swapInfo = ', swapInfo);
    processSignature(swapInfo);
    res.send('Okay');
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

}

start();



