import express from 'express';
import tvControl from './tvControl.mjs';

const app = express();
app.use(express.json());

// TV Control routes
app.use('/api/tv', tvControl);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});