const db = require('./db');

/**
 * Creates a page/item inside the user's Notion database.
 */
async function createNotionTaskPage(userId, task) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (dbErr, user) => {
      if (dbErr || !user || !user.notionConnected || !user.notionToken || !user.notionDatabaseId) {
        return resolve({ success: false, reason: 'Notion integration inactive or keys missing.' });
      }

      try {
        console.log(`[Notion Sync] Retrieving database schema for ID: ${user.notionDatabaseId}`);
        
        // Fetch database schema to dynamically detect column properties
        const schemaResponse = await fetch(`https://api.notion.com/v1/databases/${user.notionDatabaseId.trim()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.notionToken}`,
            'Notion-Version': '2022-06-28'
          }
        });

        if (!schemaResponse.ok) {
          const errText = await schemaResponse.text();
          console.error(`[Notion Sync] Failed to retrieve database schema:`, errText);
          return resolve({ success: false, reason: errText });
        }

        const dbSchema = await schemaResponse.json();

        // 1. Dynamically find the column key of type "title" (usually "Name" or "Task")
        const titleColumnKey = Object.keys(dbSchema.properties).find(
          key => dbSchema.properties[key].type === 'title'
        ) || 'Name';

        // 2. Check if optional "Priority", "Category", and "Date" properties exist
        const hasPriorityColumn = dbSchema.properties['Priority'] && dbSchema.properties['Priority'].type === 'select';
        const hasCategoryColumn = dbSchema.properties['Category'] && dbSchema.properties['Category'].type === 'select';
        const dateColumnKey = Object.keys(dbSchema.properties).find(key => dbSchema.properties[key].type === 'date');

        // 3. Construct properties payload dynamically
        const propertiesPayload = {
          [titleColumnKey]: {
            "title": [
              { "text": { "content": task.title } }
            ]
          }
        };

        if (hasPriorityColumn) {
          propertiesPayload['Priority'] = {
            "select": { "name": task.priority || 'Medium' }
          };
        }

        if (hasCategoryColumn) {
          propertiesPayload['Category'] = {
            "select": { "name": task.category || 'Personal' }
          };
        }

        if (dateColumnKey) {
          const targetTimeIso = new Date(task.createdAt + task.durationSeconds * 1000).toISOString();
          propertiesPayload[dateColumnKey] = {
            "date": { "start": targetTimeIso }
          };
        }

        console.log(`[Notion Sync] Creating page with properties (Title key: "${titleColumnKey}", Priority: ${hasPriorityColumn}, Category: ${hasCategoryColumn})`);

        // 4. Send request to create the database page
        const response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: user.notionDatabaseId.trim() },
            properties: propertiesPayload
          })
        });

        if (response.ok) {
          const pageData = await response.json();
          console.log(`[Notion Sync] Successfully synced task "${task.title}". Page ID: ${pageData.id}`);
          resolve({ success: true, pageId: pageData.id });
        } else {
          const errorText = await response.text();
          console.error(`[Notion Sync] API page creation failed:`, errorText);
          resolve({ success: false, reason: errorText });
        }
      } catch (err) {
        console.error(`[Notion Sync] Request failed for task "${task.title}":`, err.message);
        resolve({ success: false, error: err.message });
      }
    });
  });
}

async function getOrCreateNotionDatabase(accessToken) {
  try {
    // 1. Search if database "LastMinuteSaver Alarms" already exists
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'LastMinuteSaver Alarms',
        filter: { property: 'object', value: 'database' }
      })
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const existingDb = searchData.results.find(
        item => item.object === 'database' && 
        (item.title?.[0]?.plain_text === 'LastMinuteSaver Alarms' || 
         item.title?.[0]?.text?.content === 'LastMinuteSaver Alarms')
      );
      if (existingDb) {
        console.log(`[Notion Helper] Found existing database "LastMinuteSaver Alarms" (ID: ${existingDb.id})`);
        return existingDb.id;
      }
    }

    // 2. Fetch all shared pages to find a parent page to create our database inside
    const listResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!listResponse.ok) {
      const errText = await listResponse.text();
      throw new Error(`Failed to scan shared workspace items: ${errText}`);
    }

    const listData = await listResponse.json();
    const parentPage = listData.results.find(item => item.object === 'page');

    if (!parentPage) {
      // Fallback: If they only shared a database block directly instead of a parent page, return the first database ID
      const fallbackDb = listData.results.find(item => item.object === 'database');
      if (fallbackDb) {
        console.log(`[Notion Helper] No parent page found. Reusing shared database ID: ${fallbackDb.id}`);
        return fallbackDb.id;
      }
      throw new Error('No shared pages or databases found in Notion workspace scope.');
    }

    console.log(`[Notion Helper] Creating brand new database "LastMinuteSaver Alarms" inside parent page: ${parentPage.id}`);

    // 3. Create a styled database under that page
    const createDbResponse = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPage.id },
        title: [
          {
            type: 'text',
            text: { content: 'LastMinuteSaver Alarms' }
          }
        ],
        properties: {
          'Task name': { title: {} },
          'Priority': {
            select: {
              options: [
                { name: 'Low', color: 'blue' },
                { name: 'Medium', color: 'orange' },
                { name: 'Urgent', color: 'red' }
              ]
            }
          },
          'Category': {
            select: {
              options: [
                { name: 'Personal', color: 'green' },
                { name: 'Work', color: 'purple' },
                { name: 'Health', color: 'yellow' },
                { name: 'Gym', color: 'pink' },
                { name: 'Finance', color: 'gray' }
              ]
            }
          }
        }
      })
    });

    if (!createDbResponse.ok) {
      const errText = await createDbResponse.text();
      throw new Error(`Failed to create Notion database page: ${errText}`);
    }

    const newDbData = await createDbResponse.json();
    console.log(`[Notion Helper] Custom database "LastMinuteSaver Alarms" created successfully! (ID: ${newDbData.id})`);
    return newDbData.id;

  } catch (err) {
    console.error('[Notion Helper] Error in getOrCreateNotionDatabase:', err.message);
    throw err;
  }
}

module.exports = {
  createNotionTaskPage,
  getOrCreateNotionDatabase
};