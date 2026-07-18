const express = require('express');
const router  = express.Router();
const { verifyUser } = require('../middleware/authMiddleware');
const {
  createGroup, getGroup, listGroups, updateGroup,
  inviteMember, respondToInvite, removeMember, updateMemberRole,
  deleteGroup, searchUsers, requestToJoin, respondToJoinRequest, getArchivedItems, restoreArchivedItem,
  permanentlyDeleteArchivedItem, requestUnlock, getMemberProfile,
} = require('../controllers/groupController');

router.use(verifyUser);

router.get('/search-users',                    searchUsers);
router.get('/archived/items',                  getArchivedItems);
router.patch('/archived/:kind/:id/restore',    restoreArchivedItem);
router.delete('/archived/:kind/:id',           permanentlyDeleteArchivedItem);
router.get('/:id/members/:userId/profile',     getMemberProfile);
router.post('/:id/join-request',               requestToJoin);
router.post('/:id/request-unlock',             requestUnlock); // group head asks admin to unlock a locked group
router.patch('/:id/members/:memberId/respond', respondToJoinRequest); // group head approves/rejects join request
router.post('/',                               createGroup);
router.get('/',                                listGroups);
router.get('/:id',                             getGroup);
router.patch('/:id',                           updateGroup);
router.post('/:id/invite',                     inviteMember);
router.patch('/:id/respond',                   respondToInvite);
router.patch('/:id/members/:userId/role',      updateMemberRole);
router.delete('/:id/members/:userId',          removeMember);
router.delete('/:id',                          deleteGroup);

module.exports = router;