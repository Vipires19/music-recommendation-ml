import csv from 'csvtojson'
import fs from 'fs'

const inputFile = './data/high_popularity_spotify_data.csv'
const outputFile = './data/songs.json'

csv()
  .fromFile(inputFile)
  .then((jsonArray) => {

    console.log("Colunas do CSV:", Object.keys(jsonArray[0]))

    const songs = jsonArray.map((item, index) => ({
        id: index + 1,
        name: item.track_name,
        artist: item.track_artist,
        genre: item.playlist_genre,
        embedding: [
          parseFloat(item.energy) || 0,
          parseFloat(item.danceability) || 0,
          parseFloat(item.valence) || 0,
          (parseFloat(item.tempo) || 0) / 200,
          parseFloat(item.acousticness) || 0,
          (parseFloat(item.loudness) || 0) / -60
        ] 
    }))

    fs.writeFileSync(outputFile, JSON.stringify(songs, null, 2))

    console.log('✅ songs.json gerado com sucesso')
  })