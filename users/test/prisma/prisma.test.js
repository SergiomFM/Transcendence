'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')

test('Prisma Setup - Database connection and basic operations', async (t) => {
  const app = await build(t)

  // Test 1: Verify prisma is properly decorated on server
  t.test('Prisma is decorated on server instance', async () => {
    assert.ok(app.prisma, 'prisma should be decorated on server')
    assert.ok(app.prisma.user, 'prisma.user should exist')
    assert.ok(app.prisma.post, 'prisma.post should exist')
  })

  // Test 2: Create a user
  t.test('Can create a user', async () => {
    const user = await app.prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })
    
    assert.ok(user.id, 'user should have an id')
    assert.equal(user.email, 'test@example.com', 'email should match')
    assert.equal(user.name, 'Test User', 'name should match')
  })

  // Test 3: Read a user
  t.test('Can read a user', async () => {
    const user = await app.prisma.user.create({
      data: {
        email: 'read@example.com',
        name: 'Read User'
      }
    })

    const foundUser = await app.prisma.user.findUnique({
      where: { id: user.id }
    })

    assert.ok(foundUser, 'user should be found')
    assert.equal(foundUser.email, 'read@example.com', 'email should match')
  })

  // Test 4: Create user with post
  t.test('Can create a user with posts', async () => {
    const user = await app.prisma.user.create({
      data: {
        email: 'author@example.com',
        name: 'Author User',
        posts: {
          create: [
            {
              title: 'First Post',
              content: 'This is the first post',
              published: true
            },
            {
              title: 'Second Post',
              content: 'This is the second post',
              published: false
            }
          ]
        }
      },
      include: { posts: true }
    })

    assert.equal(user.posts.length, 2, 'user should have 2 posts')
    assert.equal(user.posts[0].title, 'First Post', 'first post title should match')
  })

  // Test 5: Update a user
  t.test('Can update a user', async () => {
    const user = await app.prisma.user.create({
      data: {
        email: 'update@example.com',
        name: 'Original Name'
      }
    })

    const updated = await app.prisma.user.update({
      where: { id: user.id },
      data: { name: 'Updated Name' }
    })

    assert.equal(updated.name, 'Updated Name', 'name should be updated')
  })

  // Test 6: Delete a user
  t.test('Can delete a user', async () => {
    const user = await app.prisma.user.create({
      data: {
        email: 'delete@example.com',
        name: 'Delete User'
      }
    })

    const deleted = await app.prisma.user.delete({
      where: { id: user.id }
    })

    assert.equal(deleted.id, user.id, 'deleted user id should match')

    const notFound = await app.prisma.user.findUnique({
      where: { id: user.id }
    })

    assert.strictEqual(notFound, null, 'user should not exist after deletion')
  })
})
