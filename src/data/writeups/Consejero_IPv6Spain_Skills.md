---
toc: true
title: Consejero - Skills IPv6 para España
description: Un set de Skills 
pubDate: 2026-04-26
author: Crash0v3rr1d3
---

# El Consejero IPv6 España: más plataformas, más operadores, y un evaluador de madurez
Link: https://github.com/Crash0verr1d3/IPv6Council-Consejero

---

Cuando lancé el Consejero IPv6 España, el objetivo era claro: un asistente que conoce las reglas, las hace cumplir, y trabaja con datos verificados en lugar de improvisar.


## Nueva versión

La herramienta de validación de configuraciones ya cubría Nginx, Cisco IOS y Terraform. Ahora cubre también **Linux**, **VyOS** y **Nokia SR OS**.

El caso de Linux merece un párrafo propio. Es, con diferencia, la plataforma donde más errores IPv6 silenciosos hemos visto en entornos reales españoles. El patrón más frecuente: un script de `ip6tables` migrado desde IPv4 con política DROP que no incluye ninguna regla ICMPv6 explícita. El resultado es una red que parece funcionar — las sesiones TCP establecidas van bien — pero donde NDP, PMTUD y DAD están rotos de forma invisible. La conectividad falla de maneras que son difíciles de reproducir y más difíciles aún de atribuir al firewall.

El validador ahora detecta ese patrón como `[CRITICAL]` y bloquea la entrega de la configuración hasta que esté corregido. También detecta `disable_ipv6=1` en sysctl (el equivalent de apagar IPv6 a nivel de kernel sin documentarlo), `accept_ra=0` (el host no recibirá prefijos ni gateway por Router Advertisement), `ipv6.method: ignore` en NetworkManager, y la ausencia de `use_tempaddr=2` para privacidad SLAAC en clientes.

Para VyOS, el validador verifica la presencia del bloque `router-advert`, ICMPv6 en las reglas de firewall, y RA-Guard en interfaces de acceso. Para Nokia SR OS, verifica el bloque `router-advertisements`, ICMPv6 en el `ip-filter`, y si el bloque de RA está en `shutdown`.

Y `generate_ra_config` ahora genera configuración para los cinco vendors: Cisco, Juniper, MikroTik, **VyOS** (formato `set protocols router-advert`) y **Nokia SR OS** (CLI clásica bajo la interfaz). El flujo de validación automática se mantiene para todos.

## Los operadores móviles, por fin en la base de datos

La primera versión de `isp_capability_lookup` cubría diez operadores de red fija. Útil — pero incompleta. Una parte significativa de la conectividad IPv6 en España llega por red móvil, y el comportamiento es distinto.

La base de datos tiene ahora **19 entradas**, con cobertura de fija, móvil, regional y empresarial. Los cuatro operadores móviles principales (Movistar Móvil, Orange Móvil, Vodafone Móvil, Digi Móvil) tienen sus propias entradas con datos específicos: MTU 1280 en lugar de 1500, sin DHCPv6-PD (solo /64 por dispositivo, no hay delegación de prefijo para clientes móviles), y el comportamiento de CGN que en algunos casos difiere del fijo del mismo operador.

El caso más llamativo: Digi Móvil es actualmente el único operador móvil en España que despliega IPv6 en 4G/5G sin CGN en IPv4. Es un caso raro y técnicamente honesto que merece reconocimiento.

He añadido también los ISPs regionales del grupo MásMóvil (Telecable en Asturias, R Cable en Galicia), Finetwork, Aire Networks y Avatel. Cada entrada incluye ahora el campo `segment` para distinguir fijo/móvil/empresarial y un análisis automático de brechas respecto al Plan Estratégico 2026.

## Las tres herramientas nuevas

### calculate_pd_plan — distribuir lo que delegó el ISP

Tener un prefijo /56 de Movistar es el principio, no el final. La siguiente pregunta siempre es: ¿cómo lo distribuyo? ¿Qué /64 va a gestión, cuál a cada VLAN de usuarios, cuál a IoT, cuál a la DMZ?

`calculate_pd_plan` resuelve esto en un paso: das el prefijo delegado, la lista de nombres de sitios o VLANs, y el tamaño objetivo (generalmente /64). Devuelve las asignaciones etiquetadas, los cuatro subnets reservados por convención (infraestructura, gestión OOB, DMZ, IoT) con la indicación explícita de que el subnetting de usuarios empieza después, y la zona `ip6.arpa` para la delegación inversa.

Si el prefijo del ISP es demasiado pequeño para lo que pides — por ejemplo, intentar asignar 20 VLANs desde una delegación /60 que solo da 16 subnets — la herramienta devuelve un error claro con la recomendación de pedir una delegación mayor. No silencia el problema.

### assess_ipv6_readiness — saber dónde estás antes de planificar adónde ir


`assess_ipv6_readiness` recibe nueve preguntas binarias — conectividad, plan de direccionamiento, servicios dual-stack, registros AAAA, política de firewall IPv6, RA-Guard, monitorización, formación, hoja de ruta — más el tipo de organización, y devuelve una etapa de madurez del 1 al 5, una puntuación por dimensión, la lista de brechas priorizadas, y los tres próximos pasos más impactantes.

Para organizaciones públicas, las brechas no son solo técnicas. Una AAPP sin AAAA records para sus servicios públicos no está en un estado mejorable — está incumpliendo el ENS. La herramienta lo dice directamente, junto con las implicaciones de Red SARA y qué hay que documentar en el CMDB. Para universidades, añade el contexto de RedIRIS. Para ISPs, el marco de qué esperan los clientes y qué exige el Plan 2026.

### generate_migration_plan — una hoja de ruta concreta, no una lista de buenas intenciones

La evaluación de madurez dice dónde estás. `generate_migration_plan` dice cómo llegar a IPv6-Mostly desde ahí.

Cuatro puntos de partida, cuatro conjuntos de fases distintas. Una organización IPv4-only recibe cuatro fases: foundation (conectividad y plan de direccionamiento), infraestructura dual-stack, servicios dual-stack, y transición IPv6-Mostly. Una organización ya en dual-stack completo recibe tres fases orientadas directamente a pilotar option 108, DNS64/NAT64, y la descomisión gradual de IPv4.

Si se indica el ISP, el plan incorpora datos reales: qué prefijo esperar, si hay que tener en cuenta problemas de MTU, qué implica la delegación en capacidad de subnetting. No es un plan genérico — es un plan que sabe que tu sede tiene una /56 de Movistar y que Euskaltel tiene PPPoE con MTU 1492.

Para AAPP con `ens_compliance_required=True`, el plan incluye el checklist de auditoría ENS: AAAA records publicados, política IPv6 revisada por el responsable de seguridad, plan documentado en CMDB, monitorización cubriendo incidentes IPv6. Exactamente lo que una auditoría esperaría ver.

## El Consejero como sistema integrado

Lo que hace que estas herramientas sean más que la suma de sus partes es el Consejero IPv6 España, el skill que orquesta todo. Cuando una organización pública llega preguntando "¿cómo empezamos con IPv6?", el Consejero no improvisa una respuesta general. Pregunta los nueve inputs, llama a `assess_ipv6_readiness`, presenta el diagnóstico con las implicaciones ENS específicas, llama a `generate_migration_plan` con el ISP que han indicado, y presenta una hoja de ruta por fases anclada en datos reales.

El Consejero sigue siendo lo que era en la versión anterior: un asistente con restricciones no negociables (ICMPv6 nunca se bloquea, ninguna configuración se entrega sin validar, los datos de ISPs no se inventan) y con un objetivo claro (IPv6-Mostly, no Dual-Stack como destino). Ahora tiene más herramientas, más cobertura de plataformas y más datos con los que trabajar.

El skill, el servidor y la base de datos siguen siendo recursos abiertos del Consejo. Las contribuciones — datos de ISPs, nuevas reglas de validación, soporte para vendors adicionales — son bienvenidas.

— Consejero IPv6 España · Plan Estratégico 2026

