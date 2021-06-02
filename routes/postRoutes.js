const express = require('express');
const postController = require('../controllers/postController');
const authController = require('../controllers/authController');
const Post = require('../models/postModel');

const router = express.Router();

router.get('/search', postController.search);

router.patch(
  '/:id/uploadImage',
  authController.protect,
  authController.onlyMe(Post),
  postController.uploadImage,
  postController.resizeImage,
  postController.updatePost
);

router
  .route('/:id/like')
  .patch(authController.protect, postController.like(true));

router
  .route('/:id/unlike')
  .patch(authController.protect, postController.like(false));

router
  .route('/')
  .get(postController.getAllPosts)
  .post(authController.protect, postController.createPost);

router
  .route('/:id')
  .get(postController.getPost)
  .patch(
    authController.protect,
    authController.onlyMe(Post),
    postController.updatePost
  )
  .delete(authController.protect, postController.deletePost);

module.exports = router;
