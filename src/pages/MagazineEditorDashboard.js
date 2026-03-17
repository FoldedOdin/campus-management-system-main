import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  TextField,
  Typography,
  MenuItem
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { magazineArticlesService, magazineCommentsService } from '../lib/supabaseService';
import DashboardBackdrop from '../components/DashboardBackdrop';

export default function MagazineEditorDashboard() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [articles, setArticles] = useState([]);
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [articleForm, setArticleForm] = useState({
    title: '',
    body: '',
    status: 'submitted',
    featured: 'false'
  });

  const loadData = async () => {
    try {
      const articlesData = await magazineArticlesService.getAll();
      setArticles(articlesData || []);

      const commentLists = await Promise.all(
        (articlesData || []).map((a) => magazineCommentsService.getByArticle(a.id))
      );
      const merged = (commentLists || []).flat().map((c) => ({
        ...c,
        article: (articlesData || []).find((a) => String(a.id) === String(c.article_id))
      }));
      setComments(merged);
    } catch (err) {
      console.error(err);
      setError('Failed to load magazine editor data. Run add_advanced_dashboard_modules.sql.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.body.trim()) {
      setError('Title and body are required.');
      return;
    }
    try {
      await magazineArticlesService.create({
        title: articleForm.title.trim(),
        body: articleForm.body.trim(),
        status: articleForm.status,
        featured: articleForm.featured === 'true',
        author_id: currentUser?.id,
        published_at: articleForm.status === 'published' ? new Date().toISOString() : null
      });
      setArticleForm({ title: '', body: '', status: 'submitted', featured: 'false' });
      setMessage('Article saved.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to save article.');
    }
  };

  const handleUpdateArticle = async (article, updates) => {
    try {
      await magazineArticlesService.update(article.id, updates);
      setMessage('Article updated.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to update article.');
    }
  };

  const handleUpdateCommentStatus = async (commentId, status) => {
    try {
      await magazineCommentsService.update(commentId, { status });
      setMessage('Comment updated.');
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to update comment.');
    }
  };

  const publishedCount = useMemo(
    () => articles.filter((a) => a.status === 'published').length,
    [articles]
  );

  return (
    <Box className="dashboard-shell" sx={{ minHeight: '100vh', p: 3 }}>
      <DashboardBackdrop />
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Typography variant="h4" color="white" fontWeight={700} sx={{ mb: 2 }}>
          Magazine Editor Dashboard
        </Typography>
        {!!message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {!!error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card className="dashboard-surface">
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Articles" />
              <Tab label="Comments" />
              <Tab label="Summary" />
            </Tabs>

          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Create Article</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={articleForm.title}
                    onChange={(e) => setArticleForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={articleForm.status}
                    onChange={(e) => setArticleForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <MenuItem value="submitted">Submitted</MenuItem>
                    <MenuItem value="review">Review</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Featured"
                    value={articleForm.featured}
                    onChange={(e) => setArticleForm((p) => ({ ...p, featured: e.target.value }))}
                  >
                    <MenuItem value="false">No</MenuItem>
                    <MenuItem value="true">Yes</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Body"
                    value={articleForm.body}
                    onChange={(e) => setArticleForm((p) => ({ ...p, body: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={handleCreateArticle}>Save Article</Button>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Existing Articles</Typography>
                {articles.length === 0 && <Alert severity="info">No articles yet.</Alert>}
                {articles.map((article) => (
                  <Card key={article.id} sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography fontWeight={700}>{article.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Status: {article.status} | Featured: {article.featured ? 'Yes' : 'No'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {article.body?.slice(0, 160)}{article.body?.length > 160 ? '...' : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleUpdateArticle(article, { status: 'review' })}
                        >
                          Mark Review
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() =>
                            handleUpdateArticle(article, {
                              status: 'published',
                              published_at: new Date().toISOString()
                            })
                          }
                        >
                          Publish
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            handleUpdateArticle(article, { featured: !article.featured })
                          }
                        >
                          Toggle Featured
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Moderate Comments</Typography>
              {comments.length === 0 && <Alert severity="info">No comments yet.</Alert>}
              {comments.map((comment) => (
                <Card key={comment.id} sx={{ mb: 1 }}>
                  <CardContent>
                    <Typography fontWeight={700}>
                      {comment.article?.title || 'Article'} - {comment.user?.full_name || 'Student'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {comment.status}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {comment.comment_text}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleUpdateCommentStatus(comment.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleUpdateCommentStatus(comment.id, 'rejected')}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography>Total Articles: {articles.length}</Typography>
              <Typography>Published Articles: {publishedCount}</Typography>
              <Typography>Pending Comments: {comments.filter((c) => c.status === 'pending').length}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>
    </Box>
  );
}
