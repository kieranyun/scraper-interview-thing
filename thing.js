import { JSDOM } from 'jsdom';
import { promises as fs } from 'fs';

async function main(albumEndPoint) {

  const baseURL = "https://www.lyricsmania.com"
  const sampleSongArray = ['/the_adults_are_talking_lyrics_strokes_the.html']
  const albumName = parseAlbumName(albumEndPoint)
  let albumHash = {}

  function parseAlbumName(albumEndPoint) {
    // the regex will grab the words before 'lyrics' in the album endpoint
    // would love to fix this to make it less jank
    const regex = /\/(\w+)_album/;
    const name = albumEndPoint.match(regex)
    return name[1]
  }

  async function parseDocument(url) {
    const page = await fetch(url)
    const body = await page.text()

    const dom = new JSDOM(body)
    const document = dom.window.document
    return document
  }

  async function createFolder(folderName) {
    try {
      await fs.access(`albums/${folderName}`);
    } catch (error) {
      try {
        await fs.mkdir(`albums/${folderName}`, { recursive: true });
      } catch (err) {
        console.error(`Error creating folder "${folderName}":`, err);
      }
    }
  }

  async function writeToFile(lyrics, title, folder) {
    await fs.writeFile(`./albums/${folder}/${title}.txt`, lyrics)
  }

  async function findSongPageLinks(albumEndPoint) {
    const albumURL = new URL(albumEndPoint, baseURL)

    const document = await parseDocument(albumURL)

    const linksArray = [];
    const linkElements = document.querySelectorAll('div#content ul.list li a');
    linkElements.forEach((linkElement) => {
      linksArray.push(linkElement.href);
    });

    return linksArray
  }

  async function saveSongLyrics(linksArray) {
    for (const songEndPoint of linksArray) {
      const songURL = new URL(songEndPoint, baseURL)
      const document = await parseDocument(songURL)

      const lyrics = document.querySelector('div.col-left-lyrics div.lyrics-body').textContent
      //assuming this element is always going to say 'Lyrics to <songname>', hence the substring
      const songName = document.querySelector('div.col-left-lyrics strong').textContent.substring(10)
      albumHash[songName] = lyrics
    }
  }

  async function saveAlbumLyricsToLocal(albumEndPoint) {
    await createFolder(albumName);
    const links = await findSongPageLinks(albumEndPoint);
    await saveSongLyrics(links);
    for (const [title, lyrics] of Object.entries(albumHash)) {
      await writeToFile(lyrics, title, albumName)
    }
  }

  // await saveSongLyrics(sampleSongArray)

  await saveAlbumLyricsToLocal(albumEndPoint)
}

const albumEndPoint = process.argv[2];
main(albumEndPoint)