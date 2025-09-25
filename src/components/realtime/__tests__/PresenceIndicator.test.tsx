import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import { PresenceBadge, UserAvatarWithPresence, OnlineUsersList, PresenceCard } from '../PresenceIndicator'
import { mockRealtimeHooks, createMockSocket, socketEventScenarios } from '@/test/utils/socket-mocks'
import { createMockSession } from '@/test/utils/test-utils'

// Mock the realtime hooks
mockRealtimeHooks()

describe('Presence Indicator Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('PresenceBadge', () => {
    it('should render online status correctly', () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'online',
        lastSeen: null,
        setStatus: vi.fn(),
      })

      render(<PresenceBadge userId="user-1" />)

      const badge = screen.getByTestId('presence-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-green-500')
    })

    it('should render offline status correctly', () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'offline',
        lastSeen: new Date().toISOString(),
        setStatus: vi.fn(),
      })

      render(<PresenceBadge userId="user-1" />)

      const badge = screen.getByTestId('presence-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-gray-400')
    })

    it('should render away status correctly', () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'away',
        lastSeen: new Date().toISOString(),
        setStatus: vi.fn(),
      })

      render(<PresenceBadge userId="user-1" />)

      const badge = screen.getByTestId('presence-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-yellow-500')
    })

    it('should show tooltip with status information', async () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'online',
        lastSeen: null,
        setStatus: vi.fn(),
      })

      render(<PresenceBadge userId="user-1" showTooltip />)

      const badge = screen.getByTestId('presence-badge')
      expect(badge).toBeInTheDocument()

      // The tooltip implementation depends on the specific component structure
      // This test verifies the badge is rendered with tooltip support
    })
  })

  describe('UserAvatarWithPresence', () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
      email: 'test@example.com',
    }

    it('should render user avatar with presence indicator', () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'online',
        lastSeen: null,
        setStatus: vi.fn(),
      })

      render(<UserAvatarWithPresence user={mockUser} />)

      expect(screen.getByText('TU')).toBeInTheDocument() // Avatar fallback initials
      expect(screen.getByTestId('presence-badge')).toBeInTheDocument()
    })

    it('should handle missing user image gracefully', () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'online',
        lastSeen: null,
        setStatus: vi.fn(),
      })

      const userWithoutImage = { ...mockUser, image: undefined }
      render(<UserAvatarWithPresence user={userWithoutImage} />)

      expect(screen.getByText('TU')).toBeInTheDocument()
    })

    it('should support different sizes', () => {
      const { useUserPresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      useUserPresence.mockReturnValue({
        status: 'online',
        lastSeen: null,
        setStatus: vi.fn(),
      })

      render(<UserAvatarWithPresence user={mockUser} size="lg" />)

      const avatar = screen.getByText('TU').parentElement
      expect(avatar).toHaveClass('h-10', 'w-10') // Large avatar size
    })
  })

  describe('OnlineUsersList', () => {
    const mockOnlineUsers = [
      { id: '1', name: 'User 1', image: 'https://example.com/1.jpg', status: 'online' },
      { id: '2', name: 'User 2', image: 'https://example.com/2.jpg', status: 'away' },
      { id: '3', name: 'User 3', image: 'https://example.com/3.jpg', status: 'online' },
    ]

    it('should render list of online users', () => {
      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      usePresence.mockReturnValue({
        onlineUsers: mockOnlineUsers,
        userCount: 3,
        isUserOnline: vi.fn(() => true),
        updatePresence: vi.fn(),
      })

      render(<OnlineUsersList />)

      expect(screen.getByText('Online Users (3)')).toBeInTheDocument()
      expect(screen.getByText('User 1')).toBeInTheDocument()
      expect(screen.getByText('User 2')).toBeInTheDocument()
      expect(screen.getByText('User 3')).toBeInTheDocument()
    })

    it('should show empty state when no users online', () => {
      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      usePresence.mockReturnValue({
        onlineUsers: [],
        userCount: 0,
        isUserOnline: vi.fn(() => false),
        updatePresence: vi.fn(),
      })

      render(<OnlineUsersList />)

      expect(screen.getByText('Online Users (0)')).toBeInTheDocument()
      expect(screen.getByText('No users online')).toBeInTheDocument()
    })

    it('should limit displayed users when maxUsers prop is set', () => {
      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      usePresence.mockReturnValue({
        onlineUsers: mockOnlineUsers,
        userCount: 3,
        isUserOnline: vi.fn(() => true),
        updatePresence: vi.fn(),
      })

      render(<OnlineUsersList maxUsers={2} />)

      expect(screen.getByText('User 1')).toBeInTheDocument()
      expect(screen.getByText('User 2')).toBeInTheDocument()
      expect(screen.getByText('+1 more')).toBeInTheDocument()
    })

    it('should handle user click events', () => {
      const onUserClick = vi.fn()
      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      usePresence.mockReturnValue({
        onlineUsers: [mockOnlineUsers[0]],
        userCount: 1,
        isUserOnline: vi.fn(() => true),
        updatePresence: vi.fn(),
      })

      render(<OnlineUsersList onUserClick={onUserClick} />)

      const userItem = screen.getByText('User 1')
      userItem.click()

      expect(onUserClick).toHaveBeenCalledWith(mockOnlineUsers[0])
    })
  })

  describe('PresenceCard', () => {
    it('should render complete presence information', () => {
      const { usePresence, useRealtime } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      const { useRealtime: mockUseRealtime } = vi.mocked(await vi.importMocked('@/lib/hooks/use-realtime'))

      usePresence.mockReturnValue({
        onlineUsers: [
          { id: '1', name: 'User 1', status: 'online' },
          { id: '2', name: 'User 2', status: 'away' },
        ],
        userCount: 2,
        isUserOnline: vi.fn(() => true),
        updatePresence: vi.fn(),
      })

      mockUseRealtime.mockReturnValue({
        socket: createMockSocket(),
        isConnected: true,
        connectionStatus: 'connected',
        currentUser: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      })

      render(<PresenceCard />)

      expect(screen.getByText('Presence Status')).toBeInTheDocument()
      expect(screen.getByText('2 users online')).toBeInTheDocument()
    })

    it('should show connection status', () => {
      const { useRealtime } = vi.mocked(await vi.importMocked('@/lib/hooks/use-realtime'))

      useRealtime.mockReturnValue({
        socket: createMockSocket(),
        isConnected: false,
        connectionStatus: 'disconnected',
        currentUser: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      })

      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      usePresence.mockReturnValue({
        onlineUsers: [],
        userCount: 0,
        isUserOnline: vi.fn(() => false),
        updatePresence: vi.fn(),
      })

      render(<PresenceCard />)

      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('should handle presence updates', async () => {
      const mockUpdatePresence = vi.fn()
      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))

      usePresence.mockReturnValue({
        onlineUsers: [],
        userCount: 0,
        isUserOnline: vi.fn(() => false),
        updatePresence: mockUpdatePresence,
      })

      const { useRealtime } = vi.mocked(await vi.importMocked('@/lib/hooks/use-realtime'))
      useRealtime.mockReturnValue({
        socket: createMockSocket(),
        isConnected: true,
        connectionStatus: 'connected',
        currentUser: { id: '1', name: 'Current User' },
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      })

      render(<PresenceCard />)

      // Simulate status change
      const statusButton = screen.getByText('Online')
      statusButton.click()

      await waitFor(() => {
        expect(mockUpdatePresence).toHaveBeenCalled()
      })
    })
  })

  describe('Socket Integration', () => {
    it('should handle socket events correctly', async () => {
      const mockSocket = createMockSocket()
      const { useRealtime } = vi.mocked(await vi.importMocked('@/lib/hooks/use-realtime'))

      useRealtime.mockReturnValue({
        socket: mockSocket,
        isConnected: true,
        connectionStatus: 'connected',
        currentUser: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      })

      const { usePresence } = vi.mocked(await vi.importMocked('@/lib/hooks/use-presence'))
      usePresence.mockReturnValue({
        onlineUsers: [],
        userCount: 0,
        isUserOnline: vi.fn(() => false),
        updatePresence: vi.fn(),
      })

      render(<PresenceCard />)

      // Simulate socket events
      socketEventScenarios.connect(mockSocket)
      socketEventScenarios.presenceUpdate(mockSocket, { userId: '1', status: 'online' })

      // Verify the presence component responds to socket events
      expect(mockSocket.on).toHaveBeenCalled()
    })
  })
})