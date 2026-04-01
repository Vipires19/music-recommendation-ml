export class SongService {
    async getSongs() {
        const response = await fetch('./data/songs.json');
        return await response.json();
    }

    async getSongById(id) {
        const song = await this.getSongs();
        return song.find(song => song.id === id);
    }

    async getProductsByIds(ids) {
        const song = await this.getSongs();
        return song.filter(song => ids.includes(song.id));
    }
}
