import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
	name: "ui",
	initialState: {
		activeRoomId: null,
		showCreateGroup: false,
		showInviteModal: false,
		sidebarOpen: false,
		toast: null, // { message, type: 'success' | 'error' }
	},
	reducers: {
		setActiveRoom(state, action) {
			state.activeRoomId = action.payload;
		},
		openCreateGroup(state) {
			state.showCreateGroup = true;
		},
		closeCreateGroup(state) {
			state.showCreateGroup = false;
		},
		openInviteModal(state) {
			state.showInviteModal = true;
		},
		closeInviteModal(state) {
			state.showInviteModal = false;
		},
		toggleSidebar(state) {
			state.sidebarOpen = !state.sidebarOpen;
		},
		setSidebarOpen(state, action) {
			state.sidebarOpen = action.payload;
		},
		showToast(state, action) {
			state.toast = action.payload;
		},
		clearToast(state) {
			state.toast = null;
		},
	},
});

export const {
	setActiveRoom,
	openCreateGroup,
	closeCreateGroup,
	openInviteModal,
	closeInviteModal,
	toggleSidebar,
	setSidebarOpen,
	showToast,
	clearToast,
} = uiSlice.actions;

export default uiSlice.reducer;
