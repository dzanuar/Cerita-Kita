import Home from '../pages/home/home-page';
import AddStory from '../pages/add-story/add-story-page';
import LoginPage from '../pages/login-page';
import RegisterPage from '../pages/register-page';
import FavoritesPage from '../pages/favorites/favorites-page';

const routes = {
  '/': Home,
  '/add-story': AddStory,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/favorites': FavoritesPage,
};

export default routes;