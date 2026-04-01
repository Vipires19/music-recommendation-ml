import { UserController } from './controller/UserController.js';
import { SongController } from './controller/SongController.js';
import { ModelController } from './controller/ModelTrainingController.js';
import { TFVisorController } from './controller/TFVisorController.js';

import { UserService } from './service/UserService.js';

import { UserView } from './view/UserView.js';
import { SongsView } from './view/SongsView.js';
import { ModelView } from './view/ModelTrainingView.js';
import { TFVisorView } from './view/TFVisorView.js';

import Events from './events/events.js';

// =========================
// SERVICES
// =========================

const userService = new UserService();

// =========================
// VIEWS
// =========================

const userView = new UserView();
const songsView = new SongsView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();

// =========================
// CONTROLLERS
// =========================

const userController = UserController.init({
    userView,
    userService,
    events: Events,
});

const songController = SongController.init({
    songsView,
    userService,
    events: Events,
});

ModelController.init({
    modelView,
    userService,
    events: Events,
});

TFVisorController.init({
    tfVisorView,
    events: Events,
});

// =========================
// INIT USERS
// =========================

await userController.renderUsers();