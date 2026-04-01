const News = require("../models/News");

/**
 * @desc    Get all published news (paginated)
 *          ?category=Award  ?page=1  ?limit=10
 * @route   GET /api/news
 * @access  Public
 */
const getNews = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [news, total] = await Promise.all([
      News.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      News.countDocuments(filter),
    ]);

    res.status(200).json({
      success:     true,
      count:       news.length,
      total,
      totalPages:  Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data:        news,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single news article
 * @route   GET /api/news/:id
 * @access  Public
 */
const getNewsById = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      res.status(404);
      throw new Error("News article not found");
    }
    res.status(200).json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a news article (admin only)
 * @route   POST /api/news
 * @access  Private — admin
 */
const createNews = async (req, res, next) => {
  try {
    const news = await News.create(req.body);
    res.status(201).json({ success: true, message: "News article created", data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a news article (admin only)
 * @route   PUT /api/news/:id
 * @access  Private — admin
 */
const updateNews = async (req, res, next) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!news) {
      res.status(404);
      throw new Error("News article not found");
    }
    res.status(200).json({ success: true, message: "News article updated", data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a news article (admin only)
 * @route   DELETE /api/news/:id
 * @access  Private — admin
 */
const deleteNews = async (req, res, next) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      res.status(404);
      throw new Error("News article not found");
    }
    await news.deleteOne();
    res.status(200).json({ success: true, message: "News article deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNews, getNewsById, createNews, updateNews, deleteNews };