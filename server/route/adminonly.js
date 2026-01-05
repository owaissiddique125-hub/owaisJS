const adminOnly = (req, res, next) => {
  try {
    const user = req.user; // assume clerkAuth adds req.user
    if (!user || user.publicMetadata?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied. Admins only.' }
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};