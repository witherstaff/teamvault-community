import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import fs from 'fs'

const API_BASE = 'http://localhost:3000/api/desktop/sync'

// Provide a valid Auth0 JWT obtained from the tenant here for testing
const ACCESS_TOKEN = process.env.TEST_AUTH0_TOKEN
const WORKSPACE_ID = process.env.TEST_WORKSPACE_ID

async function run() {
    if (!ACCESS_TOKEN) {
        console.error('Please set TEST_AUTH0_TOKEN in your .env file to run this test')
        return
    }

    const headers = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'x-client-os': 'TestOS',
        'x-client-system-name': 'TestSystem-01'
    }

    try {
        // ============================================================
        // 1. TEST WORKSPACE LISTING (NEW - CRITICAL FOR MULTI-WORKSPACE)
        // ============================================================
        console.log('1. Testing /workspaces (Multi-Workspace Support)')
        const workspacesRes = await fetch(`${API_BASE}/workspaces`, { headers })
        const workspaces = await workspacesRes.json()

        if (workspacesRes.status !== 200) {
            console.error('Failed /workspaces:', workspaces)
            return
        }

        console.log(`Found ${workspaces.length} workspace(s):`)
        workspaces.forEach((ws: any) => {
            console.log(`  - ${ws.name} (${ws.id})`)
            console.log(`    Role: ${ws.role}, Can Upload: ${ws.canUpload}`)
            console.log(`    Storage: ${(ws.storage.usedBytes / 1024 / 1024 / 1024).toFixed(2)} GB / ${(ws.storage.limitBytes / 1024 / 1024 / 1024).toFixed(2)} GB`)
        })

        // Use first workspace if WORKSPACE_ID not specified
        const testWorkspaceId = WORKSPACE_ID || workspaces[0]?.id
        const testWorkspaceName = workspaces.find((w: any) => w.id === testWorkspaceId)?.name || 'Unknown'

        if (!testWorkspaceId) {
            console.error('No workspace available for testing')
            return
        }

        console.log(`\nUsing workspace: ${testWorkspaceName} (${testWorkspaceId})`)

        // ============================================================
        // 2. TEST TREE RETRIEVAL
        // ============================================================
        console.log('\n2. Testing /tree')
        const treeRes = await fetch(`${API_BASE}/tree?workspaceId=${testWorkspaceId}`, { headers })
        const treeData = await treeRes.json()
        console.log('Tree response:', treeData.objects?.length, 'objects found')

        if (treeRes.status !== 200) {
            console.error('Failed tree:', treeData)
            return
        }

        // ============================================================
        // 3. TEST FOLDER CREATION
        // ============================================================
        console.log('\n3. Testing /folder/create')
        const folderCreateRes = await fetch(`${API_BASE}/folder/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workspaceId: testWorkspaceId,
                name: 'Test Sync Folder',
                parentId: null
            })
        })
        const folderCreateData = await folderCreateRes.json()

        if (folderCreateRes.status === 200) {
            console.log('✓ Folder created:', folderCreateData.folder?.name, '(ID:', folderCreateData.folder?.id, ')')
        } else if (folderCreateRes.status === 409) {
            console.log('⚠ Folder already exists (expected if running multiple times)')
        } else {
            console.error('✗ Failed /folder/create:', folderCreateData)
        }

        // ============================================================
        // 4. TEST UPLOAD INIT (with quota check)
        // ============================================================
        console.log('\n4. Testing /upload/init (with storage quota check)')
        const uploadInitRes = await fetch(`${API_BASE}/upload/init`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workspaceId: testWorkspaceId,
                name: 'test-desktop-upload.txt',
                sizeBytes: 15,
                mimeType: 'text/plain',
                checksumSha256: 'xyz'
            })
        })
        const uploadInitData = await uploadInitRes.json()

        if (uploadInitRes.status === 200) {
            const { uploadUrl, storageKey, objectId } = uploadInitData
            console.log('✓ Got upload URL, Object ID:', objectId)
            console.log('  (Skipping actual storage PUT and upload/complete to avoid orphaned DB records)')
        } else if (uploadInitRes.status === 413) {
            console.log('⚠ Storage quota exceeded:', uploadInitData)
        } else {
            console.error('✗ Failed /upload/init:', uploadInitData)
        }

        // ============================================================
        // 5. TEST DOWNLOAD
        // ============================================================
        const fileToDownload = treeData.objects?.find((o: any) => o.type === 'file')
        if (fileToDownload) {
            console.log('\n5. Testing /download')
            const downRes = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    workspaceId: testWorkspaceId,
                    objectId: fileToDownload.id
                })
            })
            const downData = await downRes.json()
            if (downRes.status === 200) {
                console.log('✓ Got download URL for:', fileToDownload.name)
            } else {
                console.error('✗ Failed download:', downData)
            }
        } else {
            console.log('\n5. (Skipping download test, no files found in workspace)')
        }

        // ============================================================
        // 6. TEST MOVE/RENAME
        // ============================================================
        const fileToMove = treeData.objects?.find((o: any) => o.type === 'file')
        if (fileToMove) {
            console.log('\n6. Testing /move (rename)')
            const moveRes = await fetch(`${API_BASE}/move`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    workspaceId: testWorkspaceId,
                    objectId: fileToMove.id,
                    newName: fileToMove.name + ' (renamed)'
                })
            })
            const moveData = await moveRes.json()
            if (moveRes.status === 200) {
                console.log('✓ File renamed to:', moveData.object?.name)

                // Rename back
                const moveBackRes = await fetch(`${API_BASE}/move`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        workspaceId: testWorkspaceId,
                        objectId: fileToMove.id,
                        newName: fileToMove.name
                    })
                })
                if (moveBackRes.status === 200) {
                    console.log('✓ File renamed back to original name')
                }
            } else {
                console.error('✗ Failed /move:', moveData)
            }
        } else {
            console.log('\n6. (Skipping move test, no files found)')
        }

        // ============================================================
        // 7. TEST DELETE (on test folder if it was created)
        // ============================================================
        if (folderCreateData.folder?.id) {
            console.log('\n7. Testing /delete')
            const deleteRes = await fetch(`${API_BASE}/delete`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    workspaceId: testWorkspaceId,
                    objectId: folderCreateData.folder.id
                })
            })
            const deleteData = await deleteRes.json()
            if (deleteRes.status === 200) {
                console.log('✓ Folder deleted successfully')
            } else {
                console.error('✗ Failed /delete:', deleteData)
            }
        } else {
            console.log('\n7. (Skipping delete test, no test folder to delete)')
        }

        // ============================================================
        // 8. TEST SYNC EVENTS LOGGING
        // ============================================================
        console.log('\n8. Testing /events (sync lifecycle logging)')
        const eventsRes = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workspaceId: testWorkspaceId,
                eventType: 'SYNC_COMPLETED',
                metadata: {
                    filesUploaded: 5,
                    filesDownloaded: 3,
                    duration: 1234
                }
            })
        })
        const eventsData = await eventsRes.json()
        if (eventsRes.status === 200) {
            console.log('✓ Sync event logged successfully')
        } else {
            console.error('✗ Failed /events:', eventsData)
        }

        // ============================================================
        // SUMMARY
        // ============================================================
        console.log('\n' + '='.repeat(60))
        console.log('Desktop Sync API Test Complete!')
        console.log('='.repeat(60))
        console.log('All Phase 1 backend endpoints tested.')
        console.log('Ready to proceed with Phase 2 (Go sync engine development).')

    } catch (e) {
        console.error('Test script error:', e)
    }
}

run()
