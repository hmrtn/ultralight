import {
  Input,
  Heading,
  Button,
  Box,
  VStack,
  Divider,
  Center,
  useToast,
  Select,
} from '@chakra-ui/react'
import { ProtocolId, ENR, fromHexString, HistoryNetworkContentKeyUnionType } from 'portalnetwork'
import React, { Dispatch, SetStateAction, useContext, useState } from 'react'
import { ContentManager } from './ContentManager'
import { Share } from '@capacitor/share'
import { PortalContext } from '../App'
import { HistoryProtocol } from 'portalnetwork/dist/subprotocols/history/history'

interface DevToolsProps {
  peers: ENR[]
  copy: () => Promise<void>
  enr: string
  peerEnr: string
  setPeerEnr: Dispatch<SetStateAction<string>>
  handleClick: () => Promise<void>
  native: boolean
}

export default function DevTools(props: DevToolsProps) {
  const portal = useContext(PortalContext)
  const [canShare, setCanShare] = useState(false)
  const peers = props.peers.map((p) => {
    return p.nodeId
  })
  const [peer, _setPeer] = useState(peers[0])
  const [targetNodeId, setTarget] = useState('')
  const [distance, setDistance] = useState('')
  const [blockHash, setBlockHash] = useState('')
  const toast = useToast()
  const handlePing = () => {
    const protocol = portal.protocols.get(ProtocolId.HistoryNetwork)!
    const enr = protocol.routingTable.getValue(peer)
    protocol.sendPing(enr!)
  }
  async function share() {
    await Share.share({
      title: `Ultralight ENR`,
      text: props.enr,
      dialogTitle: `Share ENR`,
    })
  }

  const handleFindNodes = (nodeId: string) => {
    const protocol = portal.protocols.get(ProtocolId.HistoryNetwork)
    protocol!.sendFindNodes(nodeId, [parseInt(distance)])
  }

  const handleOffer = (nodeId: string) => {
    if (blockHash.slice(0, 2) !== '0x') {
      setBlockHash('')
      toast({
        title: 'Invalid content key',
        description: 'Key must be hex prefixed',
        status: 'warning',
      })
      return
    }
    const protocol = portal.protocols.get(ProtocolId.HistoryNetwork)
    protocol!.sendOffer(nodeId, [fromHexString(blockHash)])
  }

  const sendRendezvous = async (peer: string) => {
    portal.sendRendezvous(targetNodeId, peer, ProtocolId.HistoryNetwork)
    setTarget('')
  }
  async function handleCopy() {
    await props.copy()
    toast({
      title: `ENR copied`,
      status: 'success',
      duration: 1500,
      isClosable: true,
      position: 'bottom-right',
      variant: 'solid',
    })
  }

  async function sharing() {
    const s = await Share.canShare()
    setCanShare(s.value)
  }

  React.useEffect(() => {
    sharing()
  }, [])

  const addBootNode = () => {
    portal.protocols.get(ProtocolId.HistoryNetwork)!.addBootNode(props.peerEnr)
  }

  const handleRequestSnapshot = () => {
    const protocol: HistoryProtocol = portal.protocols.get(
      ProtocolId.HistoryNetwork
    ) as HistoryProtocol
    protocol.logger('Requesting Accumulator Snapshot')
    const accumulatorKey = HistoryNetworkContentKeyUnionType.serialize({
      selector: 4,
      value: Uint8Array.from([]),
    })
    protocol.sendFindContent(peer, accumulatorKey)
  }

  return (
    <VStack>
      {canShare ? (
        <Button width={`100%`} onClick={share}>
          SHARE ENR
        </Button>
      ) : (
        <Button onClick={async () => handleCopy()} width={'100%'}>
          COPY ENR
        </Button>
      )}
      <ContentManager portal={portal} />

      {props.native ? (
        <Center>
          <VStack>
            <Button
              isDisabled={!props.peerEnr.startsWith('enr:')}
              width={'100%'}
              onClick={addBootNode}
            >
              Connect To Node
            </Button>
            <Input
              width={'100%'}
              bg="whiteAlpha.800"
              value={props.peerEnr}
              placeholder={'Node ENR'}
              onChange={(evt) => props.setPeerEnr(evt.target.value)}
            />
          </VStack>
        </Center>
      ) : (
        <VStack width={'100%'} spacing={0} border="1px" borderRadius={'0.375rem'}>
          <Input
            size="sm"
            bg="whiteAlpha.800"
            value={props.peerEnr}
            placeholder="Node ENR"
            onChange={(evt) => props.setPeerEnr(evt.target.value)}
            mb={2}
          />
          <Button width={'100%'} onClick={props.handleClick}>
            Connect To Node
          </Button>
        </VStack>
      )}
      <Divider />
      <Heading size="sm">Peer Tools</Heading>
      <Box w="100%">
        <Center>
          <Heading size="xs">
            Select Peer ({peers.indexOf(peer) + 1}/{peers.length})
          </Heading>
        </Center>
        <Divider />
        <Select value={peer} onChange={(evt) => _setPeer(evt.target.value)}>
          {peers.map((_peer) => (
            <option key={_peer} value={_peer}>
              {_peer.slice(0, 25)}...
            </option>
          ))}
        </Select>
      </Box>
      <Divider />
      <Button isDisabled={!portal} size="sm" width="100%" onClick={() => handlePing()}>
        Send Ping
      </Button>
      <Button isDisabled={!portal} size="sm" width="100%" onClick={() => handleRequestSnapshot()}>
        Request Accumulator Snapshot
      </Button>
      <Divider />
      <Input
        placeholder={'Distance'}
        onChange={(evt) => {
          setDistance(evt.target.value)
        }}
      />
      <Button isDisabled={!portal} size="sm" width="100%" onClick={() => handleFindNodes(peer)}>
        Request Nodes from Peer
      </Button>
      <Divider />
      <Input
        value={blockHash}
        placeholder="Content Key"
        onChange={(evt) => setBlockHash(evt.target.value)}
      />
      <Button isDisabled={!portal} width={'100%'} size="sm" onClick={() => handleOffer(peer)}>
        Send Offer
      </Button>
      <Divider />
      <Input
        placeholder="Target Node ID"
        value={targetNodeId}
        onChange={(evt) => setTarget(evt.target.value)}
      />
      <Button isDisabled={!targetNodeId} onClick={() => sendRendezvous(peer)} w="100%" size="sm">
        Send Rendezvous Request
      </Button>
    </VStack>
  )
}
