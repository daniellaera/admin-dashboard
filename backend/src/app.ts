import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import * as middlewares from './middleware/middlewares';
import api from './api';
import MessageResponse from './interfaces/MessageResponse';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { sendCommentNotification } from './functions/commentNotification';

require('dotenv').config();

const app = express();
const server = createServer(app);

const socketIO = new Server(server, {
  cors: {
    //origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

socketIO.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on('createPost', (data) => {
    //socket.emit('tasks', data);
    socket.broadcast.emit('postBroadcasted', data);
    //console.log('data->', data);
    // 👇🏻 sends notification via Novu
    //sendPostNotification(data.post.profileId, data.post.title, data.username);
  });

  socket.on('addComment', (data) => {
    socket.broadcast.emit('commentBroadcasted', data);
    //console.log('data->', data);
    // 👇🏻 sends notification via Novu
    sendCommentNotification(data.post.id, data.post.profileId, data.profile.authorEmail);
  });

  socket.on('disconnect', () => {
    socket.disconnect();
    console.log('🔥: A user disconnected');
  });
});

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄',
  });
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default server;
