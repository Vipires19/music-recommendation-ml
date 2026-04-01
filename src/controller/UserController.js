export class UserController {
    #userService;
    #userView;
    #events;

    constructor({
        userView,
        userService,
        events,
    }) {
        this.#userView = userView;
        this.#userService = userService;
        this.#events = events;
    }

    static init(deps) {
        return new UserController(deps);
    }

    async renderUsers(nonTrainedUser) {
        const users = await this.#userService.getDefaultUsers();

        let defaultAndNonTrained = users;
        if (nonTrainedUser) {
            await this.#userService.addUser(nonTrainedUser);
            defaultAndNonTrained = [nonTrainedUser, ...users];
        }

        this.#userView.renderUserOptions(defaultAndNonTrained);

        this.setupCallbacks();

        // 🔥 agora usamos likes
        this.#events.dispatchUsersUpdated({ users: defaultAndNonTrained });
    }

    setupCallbacks() {
        this.#userView.registerUserSelectCallback(this.handleUserSelect.bind(this))
    
        // 🔥 NOVO
        this.#events.onUsersUpdated(async () => {
            if (!this.getSelectedUserId()) return
    
            const user = await this.#userService.getUserById(this.getSelectedUserId())
            this.displayUserDetails(user)
        })
    }

    async handleUserSelect(userId) {
        const user = await this.#userService.getUserById(userId);

        this.#events.dispatchUserSelected(user);

        return this.displayUserDetails(user);
    }

    async displayUserDetails(user) {
        this.#userView.renderUserDetails(user);

        // 🔥 NOVO: renderiza likes ao invés de purchases
        this.#userView.renderLikedSongs(user.likes || []);
    }

    getSelectedUserId() {
        return this.#userView.getSelectedUserId();
    }
}